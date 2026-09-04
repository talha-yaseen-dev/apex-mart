import "server-only";
import { randomBytes } from "node:crypto";
import { InvReason, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Human order number, e.g. APEX-2607-8F3AC91D. 32 bits of crypto-random entropy
 * (per year-month prefix) makes collisions astronomically unlikely; the DB's
 * UNIQUE constraint plus `createOrderWithNumber`'s retry make duplicates
 * impossible.
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `APEX-${yy}${mm}-${rand}`;
}

/**
 * Create an order with a guaranteed-unique order number. Regenerates and retries
 * on the (astronomically rare) UNIQUE-constraint collision so a checkout never
 * fails for that reason. `build` receives the number and performs the create.
 */
export async function createOrderWithNumber<T>(
  build: (orderNumber: string) => Promise<T>,
): Promise<T> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await build(generateOrderNumber());
    } catch (e) {
      const collision =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!collision) throw e; // a real failure — surface it immediately
      // else: order-number collision — loop and try a fresh number
    }
  }
  throw new Error("Could not allocate a unique order number.");
}

/**
 * Resolve the user an order attaches to. Signed-in users pass their id; guests
 * get a shell account keyed by email (unusable password — claimable later via
 * the reset flow), so Order.userId stays satisfied and lookup-by-email works.
 */
export async function resolveOrderUserId(
  email: string,
  userId?: string,
): Promise<string> {
  if (userId) return userId;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email,
      name: email.split("@")[0] ?? "Guest",
      passwordHash: "!guest", // not a valid argon2 hash → cannot sign in
    },
  });
  return created.id;
}

/**
 * Capture a paid order — the single write path that decrements stock. Idempotent
 * (a no-op unless the order is still PENDING). The guarded UPDATE (WHERE stock >=
 * qty) makes overselling impossible even under concurrent capture; stock write,
 * inventory log, reservation release, coupon redemption, and status flip are one
 * Serializable transaction.
 */
export async function captureOrder(orderId: string): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order || order.status !== OrderStatus.PENDING) return; // idempotent

      for (const item of order.items) {
        if (!item.variantId) continue; // variant was deleted — nothing to decrement
        const updated = await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET stock = stock - ${item.quantity}
          WHERE id = ${item.variantId} AND stock >= ${item.quantity}`;
        if (updated === 0) {
          throw new Error(`Oversell guard tripped for variant ${item.variantId}`);
        }
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            delta: -item.quantity,
            reason: InvReason.SALE,
            actorId: null,
          },
        });
      }

      if (order.cartId) {
        await tx.stockReservation.deleteMany({ where: { cartId: order.cartId } });
        await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
      }
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { timesRedeemed: { increment: 1 } },
        });
      }
      await tx.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

/** Payment failed — cancel the order and release its held stock. */
export async function failOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== OrderStatus.PENDING) return;
  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId },
      data: { status: PaymentStatus.FAILED },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    }),
    ...(order.cartId
      ? [prisma.stockReservation.deleteMany({ where: { cartId: order.cartId } })]
      : []),
  ]);
}
