"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { authorize } from "@/lib/authz";
import { PERMISSIONS, getEffectivePermissions } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";
import { issueToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/emails/auth-emails";
import { logAudit } from "@/lib/audit";
import { isDemoAccount, DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE } from "@/lib/auth-constants";

const DEMO_BLOCKED = { ok: false as const, error: DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE };

const MIN_MINUTES = 5;
const MAX_MINUTES = 8 * 60;

/** Prisma filter for role assignments that are active right now. */
const activeGrant = () => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

/** A role is "admin" if it carries the super (`*`) permission. */
const adminRoleFilter = {
  permissions: { some: { permission: { key: PERMISSIONS.SUPER } } },
};

/** Employees who currently hold an admin role — used for the lockout guard. */
async function activeAdminIds(): Promise<Set<string>> {
  const rows = await prisma.roleAssignment.findMany({
    where: { ...activeGrant(), user: { isEmployee: true }, role: adminRoleFilter },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

const nameFromEmail = (email: string) => {
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._-]+/g, " ");
};

/**
 * Break-glass JIT elevation: a staff member self-grants a `selfRequestable`
 * role for a bounded window. No standing admin power — the grant auto-expires,
 * and the request is audited. (A production system would add approval routing.)
 */
export async function requestElevationAction(input: {
  roleName: string;
  minutes: number;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.isEmployee) return { ok: false as const, error: "Staff only." };

  const parsed = z
    .object({
      roleName: z.string().min(1),
      minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
      reason: z.string().trim().min(3, "Give a short reason (audited)."),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const role = await prisma.appRole.findUnique({ where: { name: parsed.data.roleName } });
  if (!role) return { ok: false as const, error: "Unknown role." };
  if (!role.selfRequestable) {
    return { ok: false as const, error: "That role can't be self-granted — an admin must assign it." };
  }

  const expiresAt = new Date(Date.now() + parsed.data.minutes * 60_000);
  await prisma.roleAssignment.create({
    data: {
      userId: user.id,
      roleId: role.id,
      grantedBy: user.id,
      reason: parsed.data.reason,
      expiresAt,
    },
  });
  await logAudit({
    actorId: user.id,
    action: "access.elevate",
    targetType: "User",
    targetId: user.id,
    diff: { role: role.name, minutes: parsed.data.minutes, reason: parsed.data.reason, expiresAt },
  });

  revalidatePath("/admin/access");
  return { ok: true as const };
}

/** Revoke an assignment early — your own, or any if you hold access:manage. */
export async function revokeAssignmentAction(assignmentId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;

  const assignment = await prisma.roleAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return { ok: false as const, error: "Not found." };

  const isOwner = assignment.userId === user.id;
  const canManage = Boolean(await authorize(PERMISSIONS.ACCESS_MANAGE));
  if (!isOwner && !canManage) return { ok: false as const, error: "Not authorized." };

  // Lockout guard: never let the final admin lose their last admin role.
  const grantsAdmin = await prisma.roleAssignment.findFirst({
    where: { id: assignmentId, role: adminRoleFilter },
    select: { id: true },
  });
  if (grantsAdmin) {
    const [admins, userOtherAdmin] = await Promise.all([
      activeAdminIds(),
      prisma.roleAssignment.count({
        where: {
          id: { not: assignmentId },
          userId: assignment.userId,
          ...activeGrant(),
          role: adminRoleFilter,
        },
      }),
    ]);
    if (userOtherAdmin === 0 && admins.has(assignment.userId) && admins.size <= 1) {
      return { ok: false as const, error: "Can't revoke the last admin's access — grant someone else admin first." };
    }
  }

  await prisma.roleAssignment.delete({ where: { id: assignmentId } });
  await logAudit({
    actorId: user.id,
    action: "access.revoke",
    targetType: "RoleAssignment",
    targetId: assignmentId,
    diff: { userId: assignment.userId, roleId: assignment.roleId },
  });

  revalidatePath("/admin/access");
  return { ok: true as const };
}

/** Admin: grant a standing role to an existing employee (access:manage). */
export async function assignRoleAction(input: { userId: string; roleName: string }) {
  const admin = await authorize(PERMISSIONS.ACCESS_MANAGE);
  if (!admin) return { ok: false as const, error: "Requires access:manage." };
  if (isDemoAccount(admin.email)) return DEMO_BLOCKED;

  const [target, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.appRole.findUnique({ where: { name: input.roleName } }),
  ]);
  if (!target || !role) return { ok: false as const, error: "User or role not found." };

  // Idempotent — don't stack duplicate standing grants of the same role.
  const existing = await prisma.roleAssignment.findFirst({
    where: { userId: target.id, roleId: role.id, expiresAt: null },
  });
  if (!existing) {
    await prisma.roleAssignment.create({
      data: { userId: target.id, roleId: role.id, grantedBy: admin.id, reason: "Assigned by admin" },
    });
  }
  if (!target.isEmployee) {
    await prisma.user.update({ where: { id: target.id }, data: { isEmployee: true } });
  }
  await logAudit({
    actorId: admin.id,
    action: "access.assign",
    targetType: "User",
    targetId: target.id,
    diff: { role: role.name },
  });

  revalidatePath("/admin/access");
  return { ok: true as const };
}

/**
 * Admin: add a teammate to the staff directory with a role (access:manage).
 * - Existing account  → promoted into the directory (they already have a login).
 * - New email         → an inactive account + a single-use invite link so they
 *                       set their own password (we never handle it).
 *
 * Capability comes entirely from the assigned role (least privilege); the legacy
 * `role` enum is left at its default so it never widens a scoped member's access.
 */
const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleName: z.string().min(1, "Choose a role."),
});

export async function inviteMemberAction(input: { email: string; roleName: string }) {
  const admin = await authorize(PERMISSIONS.ACCESS_MANAGE);
  if (!admin) return { ok: false as const, error: "Requires access:manage." };
  if (isDemoAccount(admin.email)) return DEMO_BLOCKED;

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, roleName } = parsed.data;

  const role = await prisma.appRole.findUnique({ where: { name: roleName } });
  if (!role) return { ok: false as const, error: "Unknown role." };

  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;
  let mode: "promoted" | "invited";
  let inviteUrl: string | undefined;
  let emailed = false;

  if (existing) {
    userId = existing.id;
    mode = "promoted";
    if (!existing.isEmployee) {
      await prisma.user.update({ where: { id: existing.id }, data: { isEmployee: true } });
    }
  } else {
    const name = nameFromEmail(email);
    const created = await prisma.user.create({
      data: {
        email,
        name,
        isEmployee: true,
        // Unusable random secret until the invitee sets their own via the link.
        passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      },
    });
    userId = created.id;
    mode = "invited";
    const token = await issueToken(email, TokenType.INVITE);
    inviteUrl = `${env.APP_URL}/reset?token=${token}&invite=1`;
    try {
      const { subject, html } = inviteEmail(name, inviteUrl, role.description);
      await sendEmail({ to: email, subject, html });
      emailed = true;
    } catch {
      // Email delivery is best-effort — the admin can still copy the link below.
      emailed = false;
    }
  }

  // Assign the role (idempotent).
  const already = await prisma.roleAssignment.findFirst({
    where: { userId, roleId: role.id, expiresAt: null },
  });
  if (!already) {
    await prisma.roleAssignment.create({
      data: { userId, roleId: role.id, grantedBy: admin.id, reason: `${mode} by admin` },
    });
  }
  await logAudit({
    actorId: admin.id,
    action: `access.${mode}`,
    targetType: "User",
    targetId: userId,
    diff: { email, role: role.name },
  });

  revalidatePath("/admin/access");
  return { ok: true as const, mode, email, roleName: role.name, inviteUrl, emailed };
}

/** True if the signed-in user is the single primary (owner) admin. */
async function isPrimaryAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPrimaryAdmin: true },
  });
  return Boolean(u?.isPrimaryAdmin);
}

/**
 * Primary admin only: hand the primary (owner) status to another admin. The
 * target must already hold admin (SUPER) access; the current holder steps down.
 */
export async function transferPrimaryAdminAction(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;
  if (!(await isPrimaryAdmin(user.id))) {
    return { ok: false as const, error: "Only the primary admin can transfer ownership." };
  }
  if (targetUserId === user.id) {
    return { ok: false as const, error: "You are already the primary admin." };
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return { ok: false as const, error: "User not found." };
  if (target.deactivatedAt) return { ok: false as const, error: "That account is deactivated." };

  const targetPerms = await getEffectivePermissions(target.id, target.role);
  if (!targetPerms.has(PERMISSIONS.SUPER)) {
    return {
      ok: false as const,
      error: "You can only transfer to another admin — grant them admin first.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isPrimaryAdmin: false } }),
    prisma.user.update({ where: { id: target.id }, data: { isPrimaryAdmin: true } }),
  ]);
  await logAudit({
    actorId: user.id,
    action: "access.transfer_primary",
    targetType: "User",
    targetId: target.id,
    diff: { email: target.email },
  });

  revalidatePath("/admin/access");
  return { ok: true as const };
}

/**
 * Primary admin only: deactivate (suspend sign-in + revoke staff roles) or
 * reactivate any account. The primary admin can't be deactivated, and you
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
    // Deactivate: block sign-in and strip any standing staff roles.
    await prisma.$transaction([
      prisma.roleAssignment.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { deactivatedAt: new Date(), isEmployee: false },
      }),
    ]);
  }
  await logAudit({
    actorId: user.id,
    action: active ? "account.reactivate" : "account.deactivate",
    targetType: "User",
    targetId: userId,
    diff: { email: target.email },
  });

  revalidatePath("/admin/access");
  revalidatePath("/admin/customers");
  return { ok: true as const };
}

/** Admin: remove someone from the staff directory and clear their roles. */
export async function removeMemberAction(userId: string) {
  const admin = await authorize(PERMISSIONS.ACCESS_MANAGE);
  if (!admin) return { ok: false as const, error: "Requires access:manage." };
  if (isDemoAccount(admin.email)) return DEMO_BLOCKED;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false as const, error: "User not found." };

  const admins = await activeAdminIds();
  if (admins.has(userId) && admins.size <= 1) {
    return { ok: false as const, error: "Can't remove the last admin — grant someone else admin first." };
  }

  await prisma.$transaction([
    prisma.roleAssignment.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { isEmployee: false } }),
  ]);
  await logAudit({
    actorId: admin.id,
    action: "access.remove",
    targetType: "User",
    targetId: userId,
    diff: { email: target.email },
  });

  revalidatePath("/admin/access");
  return { ok: true as const };
}
