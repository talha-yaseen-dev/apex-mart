import "server-only";
import { prisma } from "@/lib/db";
import { readOrderRefCookie } from "@/lib/order-cookie";
import { normalizePhone } from "@/lib/phone";

/**
 * Guest-safe order read for the confirmation + tracking pages. There is no
 * /api/v1 guest order route (the REST orders route is auth + by-id), so this
 * reads via Prisma with an access guard: the signed order-ref cookie (the buyer
 * who just placed it) OR a matching phone. Without one of those it returns null
 * (indistinguishable from not-found) so refs can't be enumerated.
 */

export type OrderItemView = {
  name: string;
  pack: string | null;
  qty: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  image: string | null;
  slug: string | null;
};

export type OrderView = {
  userId: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  paymentProvider: string | null;
  isGuest: boolean;
  customerName: string;
  customerPhone: string | null;
  slot: string | null;
  address: { line1: string; extras: string; city: string; region: string } | null;
  items: OrderItemView[];
};

/** Client-safe order shape for the public tracking page (no internal userId). */
export type TrackOrder = Omit<OrderView, "userId">;

export async function fetchOrder(
  ref: string,
  phone?: string | null,
  opts?: { ignoreCookie?: boolean },
): Promise<OrderView | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: ref },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
            },
          },
        },
      },
      user: { select: { id: true, name: true, phone: true, isGuest: true } },
      payments: { select: { provider: true }, take: 1 },
    },
  });
  if (!order) return null;

  // Access guard: cookie (just-placed) or a matching phone. Public tracking
  // ignores the cookie so a stale cookie can't bypass the phone check.
  const cookieRef = opts?.ignoreCookie ? null : await readOrderRefCookie();
  const viaCookie = cookieRef === ref;
  const normalized = phone ? normalizePhone(phone) : null;
  const viaPhone = normalized != null && normalized === order.user.phone;
  if (!viaCookie && !viaPhone) return null;

  // createOrderFor creates the delivery Address inline (no order link), so the
  // user's latest address is this order's. Slot + rider note were folded into
  // line2 ("Area · Rider: … · Slot: …") — parse the slot back out for display.
  const address = await prisma.address.findFirst({
    where: { userId: order.user.id },
    orderBy: { id: "desc" },
  });
  let slot: string | null = null;
  const extras: string[] = [];
  for (const part of (address?.line2 ?? "").split(" · ")) {
    if (part.startsWith("Slot: ")) slot = part.slice(6);
    else if (part) extras.push(part);
  }

  return {
    userId: order.user.id,
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.createdAt.toISOString(),
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    paymentProvider: order.payments[0]?.provider ?? null,
    isGuest: order.user.isGuest,
    customerName: order.user.name,
    customerPhone: order.user.phone,
    slot,
    address: address
      ? { line1: address.line1, extras: extras.join(" · "), city: address.city, region: address.region }
      : null,
    items: order.items.map((i) => ({
      name: i.productName,
      pack: (() => {
        const a = (i.variant?.attributes as Record<string, string> | undefined) ?? {};
        return a.packSize ?? a.pack ?? null;
      })(),
      qty: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      lineTotalMinor: i.unitPriceMinor * i.quantity,
      image: i.variant?.product?.images?.[0]?.url ?? null,
      slug: i.variant?.product?.slug ?? null,
    })),
  };
}
