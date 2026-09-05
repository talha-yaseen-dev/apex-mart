import "server-only";
import { Role } from "@prisma/client";
import { PERMISSIONS, type PermissionKey } from "@/lib/rbac-catalog";

// Re-exported so authz call sites can keep importing from "@/lib/permissions".
export { PERMISSIONS };
export type { PermissionKey };

/**
 * Two account types only: an ADMIN holds the SUPER ("*") permission (which
 * `hasPermission` treats as "all permissions"); everyone else holds none.
 */
export function baselinePermissions(role: Role): string[] {
  return role === Role.ADMIN ? [PERMISSIONS.SUPER] : [];
}

/** Wildcard-aware permission match: "*" grants all, "orders:*" grants a namespace. */
export function hasPermission(perms: Set<string>, key: string): boolean {
  if (perms.has(PERMISSIONS.SUPER)) return true;
  if (perms.has(key)) return true;
  const ns = key.split(":")[0];
  return perms.has(`${ns}:*`);
}

/**
 * Effective permissions for a user. With the RBAC roles-as-data system removed,
 * this is simply the baseline for their account type — the signature is kept so
 * existing call sites (authz, admin layout) don't change.
 */
export async function getEffectivePermissions(
  _userId: string,
  role: Role,
): Promise<Set<string>> {
  return new Set<string>(baselinePermissions(role));
}
