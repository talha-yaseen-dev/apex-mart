"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { isDemoAccount, DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE } from "@/lib/auth-constants";

const DEMO_BLOCKED = { ok: false as const, error: DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE };

/** True if the signed-in user is the single primary (owner) admin. */
async function isPrimaryAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPrimaryAdmin: true },
  });
  return Boolean(u?.isPrimaryAdmin);
}

/**
 * Primary admin only: deactivate (suspend sign-in) or reactivate any account —
 * used by the Customers page. The primary admin can't be deactivated, and you
 * can't deactivate yourself.
 */
export async function setAccountActiveAction(userId: string, active: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;
  if (!(await isPrimaryAdmin(user.id))) {
    return { ok: false as const, error: "Only the primary admin can deactivate accounts." };
  }
  if (userId === user.id) {
    return { ok: false as const, error: "You can't deactivate your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPrimaryAdmin: true },
  });
  if (!target) return { ok: false as const, error: "User not found." };
  if (target.isPrimaryAdmin) {
    return { ok: false as const, error: "The primary admin can't be deactivated." };
  }

  if (active) {
    await prisma.user.update({ where: { id: userId }, data: { deactivatedAt: null } });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date(), isEmployee: false },
    });
  }
  await logAudit({
    actorId: user.id,
    action: active ? "account.reactivate" : "account.deactivate",
    targetType: "User",
    targetId: userId,
    diff: { email: target.email },
  });

  revalidatePath("/admin/customers");
  return { ok: true as const };
}

/**
 * Primary admin only: permanently delete a customer account. Always cascades
 * the customer's addresses, wishlist and reviews, and nulls their cart / audit
 * references (per the schema's onDelete rules).
 *
 * `purgeData` decides what happens to a customer who HAS orders:
 *   - false → refused (Order/Payment are onDelete:Restrict; keep sales history).
 *   - true  → also erase their orders, order items, shipments, payments and
 *             refunds, then the account. This removes them from sales history
 *             and reports — irreversible.
 *
 * Admins, the primary admin, and your own account can never be deleted here.
 */
export async function deleteCustomerAction(userId: string, purgeData = false) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;
  if (!(await isPrimaryAdmin(user.id))) {
    return { ok: false as const, error: "Only the primary admin can delete accounts." };
  }
  if (userId === user.id) {
    return { ok: false as const, error: "You can't delete your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isPrimaryAdmin: true,
      _count: { select: { orders: true } },
    },
  });
  if (!target) return { ok: false as const, error: "User not found." };
  if (target.role === Role.ADMIN || target.isPrimaryAdmin) {
    return { ok: false as const, error: "Admin accounts can't be deleted here." };
  }

  const orderCount = target._count.orders;
  if (orderCount > 0 && !purgeData) {
    return {
      ok: false as const,
      error: `This customer has ${orderCount} order${orderCount === 1 ? "" : "s"}. Enable “also delete their data” to remove them, or deactivate instead.`,
    };
  }

  try {
    if (orderCount > 0) {
      // Erase order data first (Payment→Order and Refund→Payment are Restrict),
      // then the user (cascades addresses/wishlist/reviews; orders cascade their
      // items + shipments). All in one transaction so it's all-or-nothing.
      const orderIds = (
        await prisma.order.findMany({ where: { userId }, select: { id: true } })
      ).map((o) => o.id);
      const paymentIds = (
        await prisma.payment.findMany({
          where: { orderId: { in: orderIds } },
          select: { id: true },
        })
      ).map((p) => p.id);
      await prisma.$transaction([
        prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } }),
        prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }),
        prisma.order.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);
    } else {
      await prisma.user.delete({ where: { id: userId } });
    }
  } catch {
    return { ok: false as const, error: "Couldn't delete this account. Try again, or deactivate it instead." };
  }

  await logAudit({
    actorId: user.id,
    action: "account.delete",
    targetType: "User",
    targetId: userId,
    diff: { email: target.email, ordersDeleted: orderCount, dataPurged: purgeData },
  });

  revalidatePath("/admin/customers");
  return { ok: true as const };
}
