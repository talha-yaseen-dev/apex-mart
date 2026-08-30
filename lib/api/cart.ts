import "server-only";
import type { Cart } from "@prisma/client";
import { prisma } from "@/lib/db";
import { reservedByVariant, type CartView, type CartItemView } from "@/lib/cart";

/**
 * User-scoped cart operations for the mobile API. Mobile clients are always
 * authenticated, so there is no guest-cookie path — every operation resolves the
 * signed-in user's single cart. Availability-to-promise and the view shape match
 * lib/cart exactly (stock − Σ unexpired reservations).
 */
async function ensureUserCart(userId: string): Promise<Cart> {
  return (
    (await prisma.cart.findFirst({ where: { userId } })) ??
    (await prisma.cart.create({ data: { userId } }))
  );
}

const variantLabel = (attrs: unknown) =>
  Object.values((attrs as Record<string, string>) ?? {}).join(" · ");

export async function getCartViewFor(userId: string): Promise<CartView> {
  const cart = await ensureUserCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      variant: {
        include: {
          product: {
            include: { images: { orderBy: { position: "asc" }, take: 1 } },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const reserved = await reservedByVariant(items.map((i) => i.variantId));

  const view: CartItemView[] = items.map((i) => ({
    itemId: i.id,
    variantId: i.variantId,
    slug: i.variant.product.slug,
    name: i.variant.product.name,
    variantLabel: variantLabel(i.variant.attributes),
    sku: i.variant.sku,
    image: i.variant.product.images[0]?.url ?? null,
    unitPriceMinor: i.unitPriceMinor,
    qty: i.quantity,
    available: i.variant.stock - (reserved.get(i.variantId) ?? 0),
    lineTotalMinor: i.unitPriceMinor * i.quantity,
  }));

  return {
    id: cart.id,
    items: view,
    itemCount: view.reduce((s, i) => s + i.qty, 0),
    subtotalMinor: view.reduce((s, i) => s + i.lineTotalMinor, 0),
  };
}

export async function addToCartFor(
  userId: string,
  variantId: string,
  qty = 1,
): Promise<CartView> {
  const cart = await ensureUserCart(userId);
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error("Variant not found");

  const reserved = (await reservedByVariant([variantId])).get(variantId) ?? 0;
  const available = variant.stock - reserved;

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const nextQty = Math.min(available, (existing?.quantity ?? 0) + Math.max(1, qty));
  if (nextQty > 0) {
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: {
        cartId: cart.id,
        variantId,
        quantity: nextQty,
        unitPriceMinor: variant.priceMinor,
      },
      update: { quantity: nextQty },
    });
    await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  }
  return getCartViewFor(userId);
}

export async function setItemQtyFor(
  userId: string,
  itemId: string,
  qty: number,
): Promise<CartView> {
  const cart = await ensureUserCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { variant: true },
  });
  if (item) {
    if (qty <= 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      const reserved = (await reservedByVariant([item.variantId])).get(item.variantId) ?? 0;
      const capped = Math.min(qty, item.variant.stock - reserved);
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: Math.max(1, capped) },
      });
    }
  }
  return getCartViewFor(userId);
}

export async function removeItemFor(userId: string, itemId: string): Promise<CartView> {
  const cart = await ensureUserCart(userId);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return getCartViewFor(userId);
}
