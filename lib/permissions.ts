import "server-only";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PERMISSIONS, type PermissionKey } from "@/lib/rbac-catalog";

// Re-exported so authz call sites can keep importing from "@/lib/permissions".
export { PERMISSIONS };
export type { PermissionKey };

/** Legacy enum → baseline permissions, so existing accounts keep working. */
export function baselinePermissions(role: Role): string[] {
  switch (role) {
    case Role.ADMIN:
      return [PERMISSIONS.SUPER];
    case Role.STAFF:
      // Routine operations only: view/fulfill orders, create drafts + edit
      // product content, and adjust stock (reason recorded). Everything a
      // manager or admin does — pricing, publishing, archiving, categories,
      // cancellations, refunds, coupons, customers (PII), reports (financials),
      // deletes, and access management — is withheld from the baseline. A staff
      // member gains those only by being assigned the `manager` role (or via a
      // JIT elevation), never by default.
      return [
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_FULFILL,
        PERMISSIONS.CATALOG_CONTENT,
        PERMISSIONS.INVENTORY_ADJUST,
      ];
    default:
      return [];
  }
}

/** Wildcard-aware permission match: "*" grants all, "orders:*" grants a namespace. */
export function hasPermission(perms: Set<string>, key: string): boolean {
  if (perms.has(PERMISSIONS.SUPER)) return true;
  if (perms.has(key)) return true;
  const ns = key.split(":")[0];
  return perms.has(`${ns}:*`);
}

/**
 * Effective permissions = baseline (from the enum) ∪ permissions from every
 * ACTIVE (unexpired) role assignment. Expired JIT grants simply drop out.
 */
export async function getEffectivePermissions(
  userId: string,
  role: Role,
): Promise<Set<string>> {
  const perms = new Set<string>(baselinePermissions(role));
  const assignments = await prisma.roleAssignment.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  for (const a of assignments) {
    for (const rp of a.role.permissions) perms.add(rp.permission.key);
  }
  return perms;
}

export type ActiveGrant = {
  id: string;
  role: string;
  description: string;
  reason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

/** A user's current role assignments (for the access page). */
export async function getActiveGrants(userId: string): Promise<ActiveGrant[]> {
  const rows = await prisma.roleAssignment.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    include: { role: true },
  });
  return rows.map((r) => ({
    id: r.id,
    role: r.role.name,
    description: r.role.description,
    reason: r.reason,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
}
