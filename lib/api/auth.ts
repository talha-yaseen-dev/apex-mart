import "server-only";
import { encode, decode } from "next-auth/jwt";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getEffectivePermissions, hasPermission } from "@/lib/permissions";
import { ApiError } from "@/lib/api/http";
import { isDemoAccount, DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE } from "@/lib/auth-constants";

/**
 * Mobile session tokens. The Expo client authenticates once, stores the returned
 * token in SecureStore, and sends it as `Authorization: Bearer <token>`. Tokens
 * are NextAuth-encrypted JWTs (same NEXTAUTH_SECRET as the web session) with a
 * fixed salt so they round-trip independently of the browser session cookie.
 *
 * The token only proves identity (the user id). Authorization-critical fields
 * (role, isEmployee, deactivatedAt) are always re-read from the database on each
 * request, so elevations, promotions, and deactivations take effect immediately.
 */
const SALT = "nova-mobile-session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isEmployee: boolean;
  image: string | null;
  isPrimaryAdmin: boolean;
};

export function issueMobileToken(u: {
  id: string;
  email: string;
  name: string;
  role: Role;
  isEmployee: boolean;
}): Promise<string> {
  return encode({
    salt: SALT,
    secret: env.NEXTAUTH_SECRET,
    maxAge: MAX_AGE,
    token: {
      sub: u.id,
      uid: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isEmployee: u.isEmployee,
    },
  });
}

/** Resolve the authenticated user from the Bearer token, or null. */
export async function getApiUser(req: Request): Promise<ApiUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = /^bearer /i.test(header) ? header.slice(7).trim() : "";
  if (!token) return null;

  let payload;
  try {
    payload = await decode({ token, secret: env.NEXTAUTH_SECRET, salt: SALT });
  } catch {
    return null;
  }
  const uid = (payload?.uid ?? payload?.sub) as string | undefined;
  if (!uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isEmployee: true,
      image: true,
      isPrimaryAdmin: true,
      deactivatedAt: true,
    },
  });
  if (!user || user.deactivatedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmployee: user.isEmployee,
    image: user.image,
    isPrimaryAdmin: user.isPrimaryAdmin,
  };
}

/** Require a signed-in user (401 otherwise). */
export async function requireUser(req: Request): Promise<ApiUser> {
  const user = await getApiUser(req);
  if (!user) throw new ApiError(401, "Please sign in.");
  return user;
}

/** Require membership in the internal staff directory (for the admin surface). */
export async function requireEmployee(req: Request): Promise<ApiUser> {
  const user = await requireUser(req);
  if (!user.isEmployee) throw new ApiError(403, "Staff access only.");
  return user;
}

/**
 * Refuse a destructive/privileged action for the shared demo accounts (deletes,
 * refunds, team/role changes). Mirrors the web server-action guard so the mobile
 * surface can't be used to damage the public showcase data. Call after the
 * permission check in the handful of routes that perform those operations.
 */
export function assertNotDemo(user: ApiUser): void {
  if (isDemoAccount(user.email)) {
    throw new ApiError(403, DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE);
  }
}

/** Require a specific permission; returns the user + their effective permission set. */
export async function requirePerm(
  req: Request,
  key: string,
): Promise<{ user: ApiUser; perms: Set<string> }> {
  const user = await requireUser(req);
  const perms = await getEffectivePermissions(user.id, user.role);
  if (!hasPermission(perms, key)) {
    throw new ApiError(403, "You don't have permission to do that.");
  }
  return { user, perms };
}
