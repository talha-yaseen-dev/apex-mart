import "server-only";
import { createHash } from "node:crypto";

/**
 * Check a password against the HaveIBeenPwned breach corpus using k-anonymity:
 * only the first 5 characters of the SHA-1 hash ever leave the server, and the
 * API returns every suffix sharing that prefix for us to match locally — the
 * password itself is never transmitted.
 *
 * Fails OPEN (returns false) on any timeout or network error, so a HIBP outage
 * degrades gracefully instead of blocking legitimate sign-ups. `Add-Padding`
 * asks the API to pad the response so its size doesn't leak the match count.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    let text: string;
    try {
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return false;
      text = await res.text();
    } finally {
      clearTimeout(timeout);
    }

    for (const line of text.split("\n")) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix?.trim().toUpperCase() === suffix) {
        // Padding rows are returned with a count of 0 — a real hit is > 0.
        return Number(count?.trim() ?? "0") > 0;
      }
    }
    return false;
  } catch {
    return false; // fail open
  }
}

export const PWNED_PASSWORD_MESSAGE =
  "This password has appeared in a known data breach. Please choose a different one.";
