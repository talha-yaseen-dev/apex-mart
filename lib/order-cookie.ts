import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Signed cookie holding the most recent order ref, so the buyer who just placed
 * an order can view its confirmation without re-entering their phone. Signed
 * (HMAC over the ref, keyed by NEXTAUTH_SECRET) so it can't be forged to read
 * someone else's order.
 */
const COOKIE = "nova_order_ref";

const sign = (v: string) =>
  createHmac("sha256", env.NEXTAUTH_SECRET).update(v).digest("base64url");

export async function writeOrderRefCookie(ref: string): Promise<void> {
  (await cookies()).set(COOKIE, `${ref}.${sign(ref)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readOrderRefCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(id));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}
