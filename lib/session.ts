import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

/** Current session (or null). */
export function auth() {
  return getServerSession(authOptions);
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
    select: { deactivatedAt: true, image: true },
  });
  if (dbUser?.deactivatedAt) return null;
  return { ...user, image: dbUser?.image ?? user.image ?? null };
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
