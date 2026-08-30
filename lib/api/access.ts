import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  PERMISSIONS,
  getEffectivePermissions,
  getActiveGrants,
  hasPermission,
} from "@/lib/permissions";
import { ROLE_CATALOG } from "@/lib/rbac-catalog";
import { hashPassword } from "@/lib/password";
import { issueToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/emails/auth-emails";
import { logAudit } from "@/lib/audit";
import { ApiError } from "@/lib/api/http";
import type { ApiUser } from "@/lib/api/auth";

const MIN_MINUTES = 5;
const MAX_MINUTES = 8 * 60;

const activeGrant = () => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
const adminRoleFilter = { permissions: { some: { permission: { key: PERMISSIONS.SUPER } } } };

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

async function isPrimaryAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPrimaryAdmin: true },
  });
  return Boolean(u?.isPrimaryAdmin);
}

/** Roles a staff member may self-grant (break-glass), plus the assignable set. */
export function roleCatalog() {
  return Object.entries(ROLE_CATALOG).map(([name, r]) => ({
    name,
    description: r.description,
    selfRequestable: r.selfRequestable,
    permissions: r.permissions,
  }));
}

/** The signed-in employee's own access page: their grants + role catalog. */
export async function getMyAccess(user: ApiUser) {
  const [grants, perms, primary] = await Promise.all([
    getActiveGrants(user.id),
    getEffectivePermissions(user.id, user.role),
    isPrimaryAdmin(user.id),
  ]);
  return {
    grants,
    permissions: [...perms],
    roles: roleCatalog(),
    isPrimaryAdmin: primary,
    canManageAccess: hasPermission(perms, PERMISSIONS.ACCESS_MANAGE),
  };
}

/** Staff directory with each member's active roles (for the team screen). */
export async function getTeam() {
  const employees = await prisma.user.findMany({
    where: { isEmployee: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isPrimaryAdmin: true,
      deactivatedAt: true,
      roleAssignments: {
        where: activeGrant(),
        select: { id: true, expiresAt: true, role: { select: { name: true } } },
      },
    },
  });
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    isPrimaryAdmin: e.isPrimaryAdmin,
    deactivated: Boolean(e.deactivatedAt),
    roles: e.roleAssignments.map((a) => ({
      id: a.id,
      role: a.role.name,
      expiresAt: a.expiresAt,
    })),
  }));
}

// ── Elevation / revocation ────────────────────────────────────
export async function requestElevation(
  user: ApiUser,
  input: { roleName: string; minutes: number; reason: string },
) {
  if (!user.isEmployee) throw new ApiError(403, "Staff only.");
  const parsed = z
    .object({
      roleName: z.string().min(1),
      minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
      reason: z.string().trim().min(3, "Give a short reason (audited)."),
    })
    .safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const role = await prisma.appRole.findUnique({ where: { name: parsed.data.roleName } });
  if (!role) throw new ApiError(404, "Unknown role.");
  if (!role.selfRequestable) {
    throw new ApiError(403, "That role can't be self-granted — an admin must assign it.");
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
}

export async function revokeAssignment(user: ApiUser, assignmentId: string) {
  const assignment = await prisma.roleAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new ApiError(404, "Not found.");

  const isOwner = assignment.userId === user.id;
  const perms = await getEffectivePermissions(user.id, user.role);
  const canManage = hasPermission(perms, PERMISSIONS.ACCESS_MANAGE);
  if (!isOwner && !canManage) throw new ApiError(403, "Not authorized.");

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
      throw new ApiError(409, "Can't revoke the last admin's access — grant someone else admin first.");
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
}

// ── Admin: team management (requires access:manage) ───────────
export async function assignRole(admin: ApiUser, input: { userId: string; roleName: string }) {
  const [target, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.appRole.findUnique({ where: { name: input.roleName } }),
  ]);
  if (!target || !role) throw new ApiError(404, "User or role not found.");

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
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleName: z.string().min(1, "Choose a role."),
});

export async function inviteMember(admin: ApiUser, input: unknown) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { email, roleName } = parsed.data;

  const role = await prisma.appRole.findUnique({ where: { name: roleName } });
  if (!role) throw new ApiError(404, "Unknown role.");

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
      emailed = false;
    }
  }

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
  return { mode, email, roleName: role.name, inviteUrl, emailed };
}

export async function removeMember(admin: ApiUser, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new ApiError(404, "User not found.");

  const admins = await activeAdminIds();
  if (admins.has(userId) && admins.size <= 1) {
    throw new ApiError(409, "Can't remove the last admin — grant someone else admin first.");
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
}

// ── Primary (owner) admin controls ────────────────────────────
export async function transferPrimaryAdmin(user: ApiUser, targetUserId: string) {
  if (!(await isPrimaryAdmin(user.id))) {
    throw new ApiError(403, "Only the primary admin can transfer ownership.");
  }
  if (targetUserId === user.id) throw new ApiError(400, "You are already the primary admin.");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new ApiError(404, "User not found.");
  if (target.deactivatedAt) throw new ApiError(400, "That account is deactivated.");

  const targetPerms = await getEffectivePermissions(target.id, target.role);
  if (!targetPerms.has(PERMISSIONS.SUPER)) {
    throw new ApiError(400, "You can only transfer to another admin — grant them admin first.");
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
}

export async function setAccountActive(user: ApiUser, userId: string, active: boolean) {
  if (!(await isPrimaryAdmin(user.id))) {
    throw new ApiError(403, "Only the primary admin can deactivate accounts.");
  }
  if (userId === user.id) throw new ApiError(400, "You can't deactivate your own account.");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPrimaryAdmin: true },
  });
  if (!target) throw new ApiError(404, "User not found.");
  if (target.isPrimaryAdmin) throw new ApiError(400, "The primary admin can't be deactivated.");

  if (active) {
    await prisma.user.update({ where: { id: userId }, data: { deactivatedAt: null } });
  } else {
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
}
