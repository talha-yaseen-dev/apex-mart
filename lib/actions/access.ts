"use server";

import { revalidatePath } from "next/cache";
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
