import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP from proxy headers. Behind Vercel's edge the real
 * client address is the first entry of `x-forwarded-for`. These headers are
 * spoofable when the app isn't behind a trusted proxy, so the value is only
 * ever used as a *secondary* rate-limit dimension (alongside account/email),
 * never for authorization. Returns "unknown" when no address is available.
 */
export function ipFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Client IP within a server action / RSC request scope. */
export async function clientIp(): Promise<string> {
  try {
    return ipFromHeaders(await headers());
  } catch {
    return "unknown";
  }
}
