import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

/**
 * Current session (or null). A stale or foreign `next-auth.session-token`
 * cookie — e.g. one signed with a different NEXTAUTH_SECRET, which is easy to
 * end up with on localhost where cookies are shared across ports/apps — fails
 * JWT decryption and makes `getServerSession` throw. Public storefront pages
 * now read the session (for the wishlist heart's saved state), so that failure
 * must degrade to "signed out" rather than crash a public render. next-auth
 * logs the underlying JWT_SESSION_ERROR itself; here we just treat it as no
 * session. The next sign-in overwrites the bad cookie.
 */
export async function auth() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

/**
 * Current user (or null). Deactivated accounts are treated as signed out
 * everywhere — a single choke point that covers pages and server actions even
 * while a stale JWT session is still valid. Cached per request so the extra
 * lookup runs at most once per render.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const user = session?.user ?? null;
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { deactivatedAt: true, image: true, name: true, phone: true, email: true },
  });
  if (dbUser?.deactivatedAt) return null;
  // Source identity (name/phone/image/EMAIL) from the DB, not the sign-in-time
  // JWT, so profile edits AND an email change show up on the next render without
  // a re-login — a stale JWT can never keep displaying an outdated account email.
  return {
    ...user,
    email: dbUser?.email ?? user.email,
    name: dbUser?.name ?? user.name,
    phone: dbUser?.phone ?? null,
    image: dbUser?.image ?? user.image ?? null,
  };
});

/** Require a signed-in user or redirect to sign-in. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/** Require one of the given roles or redirect (STAFF/ADMIN gating). */
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
