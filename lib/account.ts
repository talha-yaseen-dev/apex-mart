import "server-only";
import { OrderStatus, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cardInclude, toCard } from "@/lib/catalog";

const money = (c: number) => c;

// ── Orders ────────────────────────────────────────────────────
export async function getUserOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } },
          },
        },
      },
    },
  });

  return orders.map((o) => {
    const first = o.items[0];
    const extra = o.items.length - 1;
    return {
      id: o.id,
      number: o.orderNumber,
      status: o.status,
      date: o.createdAt,
      totalMinor: o.totalMinor,
      thumbs: o.items.slice(0, 3).map((i) => ({
        image: i.variant?.product.images[0]?.url ?? null,
        label: i.productName,
      })),
      summary:
        (first ? first.productName : "No items") +
        (extra > 0 ? ` + ${extra} more` : ""),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    };
  });
}

const STATUS_RANK: Record<string, number> = {
  PAID: 1,
  FULFILLED: 2,
  DELIVERED: 4,
};

export async function getOrderForUser(orderId: string, userId: string) {
  const o = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } },
        },
      },
      shipments: { orderBy: { id: "desc" }, take: 1 },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { email: true, phone: true } },
    },
  });
  if (!o) return null;

  const shipment = o.shipments[0] ?? null;
  const shipped =
    shipment?.status === ShipmentStatus.SHIPPED ||
    shipment?.status === ShipmentStatus.IN_TRANSIT;
  const delivered =
    o.status === OrderStatus.DELIVERED ||
    shipment?.status === ShipmentStatus.DELIVERED;

  const rank = delivered ? 4 : shipped ? 3 : (STATUS_RANK[o.status] ?? 1);
  const steps = [
    { key: "PAID", label: "Order placed", when: o.createdAt },
    { key: "FULFILLED", label: "Packed", when: null },
    { key: "SHIPPED", label: "Shipped", when: shipment?.shippedAt ?? null },
    { key: "DELIVERED", label: "Delivered", when: shipment?.deliveredAt ?? null },
  ].map((s, i) => ({ ...s, done: i + 1 <= rank }));

  return {
    id: o.id,
    number: o.orderNumber,
    status: o.status,
    placedDate: o.createdAt,
    email: o.user.email,
    shipment: shipment
      ? {
          carrier: shipment.carrier,
          tracking: shipment.trackingNumber,
          steps,
        }
      : { carrier: null, tracking: null, steps },
    items: o.items.map((i) => ({
      id: i.id,
      productSlug: i.variant?.product.slug ?? null,
      name: i.productName,
      variantLabel: Object.values(
        (i.variant?.attributes as Record<string, string>) ?? {},
      ).join(" · "),
      sku: i.sku,
      image: i.variant?.product.images[0]?.url ?? null,
      unitMinor: i.unitPriceMinor,
      qty: i.quantity,
      lineTotalMinor: i.unitPriceMinor * i.quantity,
    })),
    subtotalMinor: money(o.subtotalMinor),
    discountMinor: o.discountMinor,
    shippingMinor: o.shippingMinor,
    taxMinor: o.taxMinor,
    totalMinor: o.totalMinor,
    // COD-only store: an order carries a `cod` payment set SUCCEEDED at confirm.
    // Fall back to `cod` so the detail page always shows a method.
    payment: {
      provider: o.payments[0]?.provider ?? "cod",
      status: o.payments[0]?.status ?? null,
    },
    customerPhone: o.user.phone,
    canReturn: o.status === OrderStatus.DELIVERED,
    canReview: o.status === OrderStatus.DELIVERED,
  };
}

// ── Addresses ─────────────────────────────────────────────────
export function getAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
}

// ── Wishlist ──────────────────────────────────────────────────
export async function getWishlist(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { take: 1, orderBy: { position: "asc" } },
          variants: { orderBy: { priceMinor: "asc" } },
        },
      },
    },
  });
  return rows.map((w) => {
    const cheapest = w.product.variants[0];
    return {
      id: w.id,
      productSlug: w.product.slug,
      name: w.product.name,
      image: w.product.images[0]?.url ?? null,
      priceMinor: cheapest?.priceMinor ?? 0,
      firstVariantId: cheapest?.id ?? null,
      inStock: w.product.variants.some((v) => v.stock > 0),
    };
  });
}

/**
 * Wishlist rows mapped to storefront `StoreCard`s so the account wishlist can
 * reuse `ProductCard` (and its cart wiring) verbatim. Separate from `getWishlist`
 * — that one's minimal shape is the /api/v1/wishlist response and must not change.
 */
export async function getWishlistCards(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { include: cardInclude } },
  });
  return rows.map((w) => ({ id: w.id, card: toCard(w.product) }));
}

// ── Reviews ───────────────────────────────────────────────────
export async function getReviewData(userId: string) {
  const [deliveredItems, myReviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: OrderStatus.DELIVERED } },
      include: {
        variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } },
        order: { select: { createdAt: true } },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } },
    }),
  ]);

  const reviewedProductIds = new Set(myReviews.map((r) => r.productId));
  const seen = new Set<string>();
  const eligible: {
    productId: string;
    name: string;
    image: string | null;
    deliveredDate: Date;
  }[] = [];
  for (const it of deliveredItems) {
    if (!it.variant) continue; // product was permanently deleted — nothing to review
    const pid = it.variant.productId;
    if (reviewedProductIds.has(pid) || seen.has(pid)) continue;
    seen.add(pid);
    eligible.push({
      productId: pid,
      name: it.variant.product.name,
      image: it.variant.product.images[0]?.url ?? null,
      deliveredDate: it.order.createdAt,
    });
  }

  return {
    eligible,
    myReviews: myReviews.map((r) => ({
      id: r.id,
      name: r.product.name,
      image: r.product.images[0]?.url ?? null,
      rating: r.rating,
      title: r.title,
      body: r.body,
      date: r.createdAt,
    })),
  };
}

export async function getAccountCounts(userId: string) {
  const [wishlist, orders] = await Promise.all([
    prisma.wishlist.count({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { wishlist, orders };
}
