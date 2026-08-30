import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Guest cart identity lives in a signed, httpOnly cookie: `<cartId>.<hmac>`.
 * The HMAC (over the cartId, keyed by NEXTAUTH_SECRET) means the value can't be
 * forged to point at someone else's cart.
 */
const COOKIE = "nova_cart";

const sign = (id: string) =>
  createHmac("sha256", env.NEXTAUTH_SECRET).update(id).digest("base64url");

export async function readCartCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function writeCartCookie(id: string): Promise<void> {
  (await cookies()).set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
