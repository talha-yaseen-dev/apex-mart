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
  return readSigned(COOKIE);
}

/**
 * The real contact email captured at checkout, so the confirmation page can
 * pre-fill it (read-only) for the guest → account upsell. Order has no email
 * column, so this lives in a short-lived signed cookie rather than the DB.
 */
const EMAIL_COOKIE = "nova_order_email";
const SEP = "::";

export async function writeOrderEmailCookie(ref: string, email: string): Promise<void> {
  const value = `${ref}${SEP}${email}`;
  (await cookies()).set(EMAIL_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** The captured email for THIS order ref, or null (ref-scoped so it can't leak
 *  a previous order's email onto a different confirmation). */
export async function readOrderEmailCookie(ref: string): Promise<string | null> {
  const value = await readSigned(EMAIL_COOKIE);
  if (!value) return null;
  const i = value.indexOf(SEP);
  if (i < 0) return null;
  return value.slice(0, i) === ref ? value.slice(i + SEP.length) : null;
}

async function readSigned(name: string): Promise<string | null> {
  const raw = (await cookies()).get(name)?.value;
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
