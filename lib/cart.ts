import "server-only";
import type { Cart } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isTyreCategory } from "@/lib/tyres";
import {
  clearCartCookie,
  readCartCookie,
  writeCartCookie,
} from "@/lib/cart-cookie";

// ── Available-to-promise ──────────────────────────────────────
/** stock − Σ(unexpired reservation qty) for each variant. */
export async function reservedByVariant(
  variantIds: string[],
): Promise<Map<string, number>> {
  if (!variantIds.length) return new Map();
  const rows = await prisma.stockReservation.groupBy({
    by: ["variantId"],
    where: { variantId: { in: variantIds }, expiresAt: { gt: new Date() } },
    _sum: { qty: true },
  });
  return new Map(rows.map((r) => [r.variantId, r._sum.qty ?? 0]));
}

// ── Resolution ────────────────────────────────────────────────
/** Read-only: the cart to display, or null. Prefers the user's cart. */
export async function resolveCart(): Promise<Cart | null> {
  const user = await getCurrentUser();
  if (user) return prisma.cart.findFirst({ where: { userId: user.id } });
  const id = await readCartCookie();
  return id ? prisma.cart.findUnique({ where: { id } }) : null;
}

/**
 * Write context (server actions only — mutates cookies): ensures a cart exists.
 * On sign-in, merges any guest-cookie cart into the user's cart and clears it.
 */
export async function ensureCart(): Promise<Cart> {
  const user = await getCurrentUser();

  if (user) {
    const userCart =
      (await prisma.cart.findFirst({ where: { userId: user.id } })) ??
      (await prisma.cart.create({ data: { userId: user.id, currency: "PKR" } }));

    const guestId = await readCartCookie();
    if (guestId && guestId !== userCart.id) {
      const guest = await prisma.cart.findUnique({
        where: { id: guestId },
        include: { items: true },
      });
      if (guest) {
        for (const gi of guest.items) {
          await prisma.cartItem.upsert({
            where: {
              cartId_variantId: {
                cartId: userCart.id,
                variantId: gi.variantId,
              },
            },
            create: {
              cartId: userCart.id,
              variantId: gi.variantId,
              quantity: gi.quantity,
              unitPriceMinor: gi.unitPriceMinor,
            },
            update: { quantity: { increment: gi.quantity } },
          });
        }
        await prisma.cart.delete({ where: { id: guest.id } });
      }
      await clearCartCookie();
    }
    return userCart;
  }

  const guestId = await readCartCookie();
  if (guestId) {
    const existing = await prisma.cart.findUnique({ where: { id: guestId } });
    if (existing) return existing;
  }
  const created = await prisma.cart.create({ data: { currency: "PKR" } });
  await writeCartCookie(created.id);
  return created;
}

// ── View model ────────────────────────────────────────────────
export type CartItemView = {
  itemId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  sku: string;
  image: string | null;
  unitPriceMinor: number;
  qty: number;
  available: number;
  lineTotalMinor: number;
};

export type CartView = {
  id: string;
  items: CartItemView[];
  itemCount: number;
  subtotalMinor: number;
};

const variantLabel = (attrs: unknown) =>
  Object.values((attrs as Record<string, string>) ?? {}).join(" · ");

export async function getCartView(): Promise<CartView | null> {
  const cart = await resolveCart();
  if (!cart) return null;

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      variant: {
        include: {
          product: { include: { category: true, images: { orderBy: { position: "asc" }, take: 1 } } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const reserved = await reservedByVariant(items.map((i) => i.variantId));

  const view: CartItemView[] = items.map((i) => {
    // An archived (deletedAt) or non-ACTIVE product is no longer purchasable, so
    // it reads as 0 available — the cart UI shows it as out of stock and the
    // checkout reservation guard (reserveCart) rejects it. Keeps a removed
    // product from being bought out of a stale cart.
    const purchasable =
      i.variant.product.deletedAt === null &&
      i.variant.product.status === "ACTIVE" &&
      isTyreCategory(i.variant.product.category.slug) &&
      i.variant.priceMinor > 0;
    return {
      itemId: i.id,
      variantId: i.variantId,
      slug: i.variant.product.slug,
      name: i.variant.product.name,
      variantLabel: variantLabel(i.variant.attributes),
      sku: i.variant.sku,
      image: i.variant.product.images[0]?.url ?? null,
      unitPriceMinor: i.unitPriceMinor,
      qty: i.quantity,
      available: purchasable ? i.variant.stock - (reserved.get(i.variantId) ?? 0) : 0,
      lineTotalMinor: i.unitPriceMinor * i.quantity,
    };
  });

  return {
    id: cart.id,
    items: view,
    itemCount: view.reduce((s, i) => s + i.qty, 0),
    subtotalMinor: view.reduce((s, i) => s + i.lineTotalMinor, 0),
  };
}

// ── Mutations (called from server actions) ────────────────────
export async function addToCart(variantId: string, qty = 1): Promise<void> {
  const cart = await ensureCart();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId }, include: { product: { include: { category: true } } },
  });
  if (!variant || variant.priceMinor <= 0 || variant.product.status !== "ACTIVE" || variant.product.deletedAt || !isTyreCategory(variant.product.category.slug))
    throw new Error("Tyre is unavailable");

  const reserved = (await reservedByVariant([variantId])).get(variantId) ?? 0;
  const available = variant.stock - reserved;

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const nextQty = Math.min(available, (existing?.quantity ?? 0) + qty);
  if (nextQty <= 0) return;

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

export async function setItemQty(itemId: string, qty: number): Promise<void> {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { variant: true },
  });
  if (!item) return;
  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return;
  }
  const reserved = (await reservedByVariant([item.variantId])).get(item.variantId) ?? 0;
  const capped = Math.min(qty, item.variant.stock - reserved);
  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: Math.max(1, capped) },
  });
}

export async function removeItem(itemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { id: itemId } });
}
