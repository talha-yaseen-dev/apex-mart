import "server-only";
import { redirect } from "next/navigation";
import type { User } from "next-auth";
import { getCurrentUser } from "@/lib/session";
import {
  getEffectivePermissions,
  hasPermission,
} from "@/lib/permissions";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Current user + their effective permission set (empty for guests). */
export async function myPermissions(): Promise<{
  user: SessionUser | null;
  perms: Set<string>;
}> {
  const user = await getCurrentUser();
  if (!user) return { user: null, perms: new Set() };
  const perms = await getEffectivePermissions(user.id, user.role);
  return { user, perms };
}

/** Boolean permission check for the current user. */
export async function can(key: string): Promise<boolean> {
  const { perms } = await myPermissions();
  return hasPermission(perms, key);
}

/** Returns the user if they hold the permission, else null (for actions). */
export async function authorize(key: string): Promise<SessionUser | null> {
  const { user, perms } = await myPermissions();
  if (!user || !hasPermission(perms, key)) return null;
  return user;
}

/** Gate for the internal admin surface — must be in the staff directory. */
export async function requireEmployee(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/admin");
  if (!user.isEmployee) redirect("/");
  return user;
}

/** Require a permission or redirect (for page-level guards). */
export async function requirePermission(key: string): Promise<SessionUser> {
  const { user, perms } = await myPermissions();
  if (!user) redirect("/signin?callbackUrl=/admin");
  if (!hasPermission(perms, key)) redirect("/admin");
  return user;
}

export type { User };
