import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Six-digit one-time verification codes (OTP) for email verification and email
 * changes. Deliberately reuses the VerificationToken table + rotation/single-use
 * semantics of lib/tokens.ts, but with two hardening differences suited to a
 * low-entropy (6-digit) secret:
 *
 *   1. The stored value is an HMAC keyed by NEXTAUTH_SECRET over
 *      `${type}:${identifier}:${code}` — NOT a bare hash of the code. A 6-digit
 *      space is only 900k values, so an unsalted SHA-256 of the code would be a
 *      trivially reversible rainbow table on a DB leak, and two users sharing a
 *      code would collide on the unique tokenHash. Keying by the server secret
 *      makes a DB leak useless without the secret, and binding the code to its
 *      (type, identifier) means a code is ONLY ever valid for the exact purpose
 *      and identity it was issued for — never reusable across accounts/purposes.
 *   2. Codes live 10 minutes (vs 24h/60m for links).
 *
 * The raw code exists only briefly: returned here (to be emailed) and submitted
 * back by the user. It is never logged, never persisted in plaintext, and never
 * returned from any server action / API.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // exactly 10 minutes
export const CODE_TTL_MINUTES = 10;

/** Exactly six numeric digits, cryptographically generated (never Math.random). */
export function generateCode(): string {
  // randomInt is uniform over [100000, 1000000) → always a 6-digit string.
  return String(randomInt(100_000, 1_000_000));
}

/** True only for an exactly-six-ASCII-digit string. */
export function isSixDigitCode(v: unknown): v is string {
  return typeof v === "string" && /^[0-9]{6}$/.test(v);
}

/** Keyed, purpose+identity-bound hash. Same inputs → same hash (for lookup);
 *  different purpose/identity/code → different hash. */
function hashCode(type: TokenType, identifier: string, code: string): string {
  return createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(`${type}:${identifier}:${code}`)
    .digest("hex");
}

/**
 * Issue a fresh 6-digit code for (identifier, type), rotating out any prior
 * codes of the same type+identifier so ONLY the newest is usable. Returns the
 * raw code — the sole place it exists outside the outgoing email.
 */
export async function issueCode(identifier: string, type: TokenType): Promise<string> {
  const id = identifier.toLowerCase();
  const code = generateCode();
  await prisma.verificationToken.deleteMany({ where: { identifier: id, type } });
  await prisma.verificationToken.create({
    data: {
      identifier: id,
      type,
      tokenHash: hashCode(type, id, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export type CodeResult =
  | { ok: true; identifier: string }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Validate + atomically consume a code. Single-use: the matching row is deleted
 * regardless of expiry outcome, and the delete is race-safe (deleteMany affects
 * at most one row, so two concurrent submissions of the same valid code — only
 * one wins). Server time is authoritative for expiry.
 */
export async function consumeCode(
  identifier: string,
  type: TokenType,
  code: string,
): Promise<CodeResult> {
  const id = identifier.toLowerCase();
  if (!isSixDigitCode(code)) return { ok: false, reason: "invalid" };

  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashCode(type, id, code) },
  });
  // Defence in depth: the HMAC already binds type+identifier, but re-check the
  // stored columns so a lookup can never cross a purpose/identity boundary.
  if (!row || row.type !== type || row.identifier !== id) {
    return { ok: false, reason: "invalid" };
  }

  const { count } = await prisma.verificationToken.deleteMany({ where: { id: row.id } });
  if (count === 0) return { ok: false, reason: "invalid" }; // lost the race → already consumed
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, identifier: id };
}

/** Composite identifier binding an EMAIL_CHANGE code to BOTH the acting user
 *  and the target address, so one user's pending change can't collide with or
 *  be consumed by another (VerificationToken has no userId column). */
export function emailChangeIdentifier(userId: string, newEmail: string): string {
  return `${userId.toLowerCase()}:${newEmail.toLowerCase()}`;
}

/** Drop every pending EMAIL_CHANGE code for a user (any target address). Matches
 *  the lowercased identifier that issueCode/consumeCode persist. */
export async function clearPendingEmailChanges(userId: string): Promise<void> {
  await prisma.verificationToken.deleteMany({
    where: { type: TokenType.EMAIL_CHANGE, identifier: { startsWith: `${userId.toLowerCase()}:` } },
  });
}
