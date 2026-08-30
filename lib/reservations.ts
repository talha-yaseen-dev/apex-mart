import "server-only";
import { prisma } from "@/lib/db";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export class OutOfStockError extends Error {
  constructor(public variantId: string) {
    super(`Insufficient stock for variant ${variantId}`);
    this.name = "OutOfStockError";
  }
}

/**
 * Reserve every cart line in one Serializable transaction. Each variant row is
 * locked FOR UPDATE so two checkouts can't both read the same availability and
 * each think there's room. available = stock − Σ(unexpired reservations).
 * Returns the shared expiry.
 */
export async function reserveCart(cartId: string): Promise<Date> {
  const items = await prisma.cartItem.findMany({ where: { cartId } });
  if (!items.length) throw new Error("Cart is empty");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.$transaction(
    async (tx) => {
      // Drop this cart's prior (possibly expired) holds, then re-reserve.
      await tx.stockReservation.deleteMany({ where: { cartId } });
      for (const line of items) {
        // Join Product and require it to still be purchasable: an archived
        // (deletedAt) or non-ACTIVE product yields no row, so a removed product
        // sitting in an old cart can't be checked out. Only the variant row is
        // locked (FOR UPDATE OF v).
        const rows = await tx.$queryRaw<{ stock: number; reserved: number }[]>`
          SELECT v.stock AS stock,
            COALESCE((
              SELECT SUM(r.qty) FROM "StockReservation" r
              WHERE r."variantId" = v.id AND r."expiresAt" > now()
            ), 0)::int AS reserved
          FROM "ProductVariant" v
          JOIN "Product" p ON p.id = v."productId"
          WHERE v.id = ${line.variantId}
            AND p."deletedAt" IS NULL
            AND p.status = 'ACTIVE'
          FOR UPDATE OF v`;
        const row = rows[0];
        if (!row || row.stock - row.reserved < line.quantity) {
          throw new OutOfStockError(line.variantId);
        }
        await tx.stockReservation.create({
          data: { variantId: line.variantId, cartId, qty: line.quantity, expiresAt },
        });
      }
    },
    { isolationLevel: "Serializable" },
  );

  return expiresAt;
}

/** TTL sweep — deletes all expired reservations (called by the Phase 7 job). */
export async function releaseExpired(): Promise<number> {
  const { count } = await prisma.stockReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

export async function releaseForCart(cartId: string): Promise<void> {
  await prisma.stockReservation.deleteMany({ where: { cartId } });
}
