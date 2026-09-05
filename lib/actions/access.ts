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
 * Primary admin only: permanently delete EVERY customer account and all of
 * their data — orders, order items, shipments, payments, refunds, addresses,
 * wishlist and reviews. Admin accounts (including the primary admin) are never
 * touched. Irreversible: this wipes customer sales history, so revenue/orders
 * reports drop to zero. Runs as a single all-or-nothing transaction.
 */
export async function deleteAllCustomersAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;
  if (!(await isPrimaryAdmin(user.id))) {
    return { ok: false as const, error: "Only the primary admin can delete accounts." };
  }

  const customerIds = (
    await prisma.user.findMany({ where: { role: Role.CUSTOMER }, select: { id: true } })
  ).map((c) => c.id);
  if (customerIds.length === 0) return { ok: true as const, deleted: 0 };

  const orderIds = (
    await prisma.order.findMany({ where: { userId: { in: customerIds } }, select: { id: true } })
  ).map((o) => o.id);
  const paymentIds = orderIds.length
    ? (
        await prisma.payment.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } })
      ).map((p) => p.id)
    : [];

  try {
    // Delete order data first (Payment→Order and Refund→Payment are Restrict),
    // then the customer rows (cascades addresses/wishlist/reviews; orders cascade
    // their items + shipments). The role guard ensures no admin is ever removed.
    await prisma.$transaction([
      prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } }),
      prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }),
      prisma.order.deleteMany({ where: { userId: { in: customerIds } } }),
      prisma.user.deleteMany({ where: { id: { in: customerIds }, role: Role.CUSTOMER } }),
    ]);
  } catch {
    return { ok: false as const, error: "Couldn't delete all accounts. Please try again." };
  }

  await logAudit({
    actorId: user.id,
    action: "account.delete_all",
    targetType: "User",
    targetId: "*",
    diff: { deletedCustomers: customerIds.length, deletedOrders: orderIds.length },
  });

  revalidatePath("/admin/customers");
  return { ok: true as const, deleted: customerIds.length };
}
