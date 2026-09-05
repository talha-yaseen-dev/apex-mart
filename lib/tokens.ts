import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";

// TTLs for the single-use LINK tokens only. EMAIL_VERIFY + EMAIL_CHANGE are now
// 6-digit codes with their own 10-minute TTL (see lib/otp.ts) and are never
// issued through here — issuing one throws below.
const TTL_MS: Partial<Record<TokenType, number>> = {
  PASSWORD_RESET: 60 * 60 * 1000, // 60 min
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days — new teammates need time to accept
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Issue a single-use token. Only its SHA-256 hash is persisted; issuing a new
 * token of the same type for an identifier invalidates any prior ones.
 * Returns the raw token to embed in the emailed link.
 */
export async function issueToken(
  identifier: string,
  type: TokenType,
): Promise<string> {
  const ttl = TTL_MS[type];
  if (ttl === undefined) {
    throw new Error(`tokens.ts does not issue ${type} tokens — use lib/otp.ts for codes.`);
  }
  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.deleteMany({ where: { identifier, type } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      type,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  return raw;
}

/**
 * Validate + consume a token. Deletes it (single-use) regardless of outcome,
 * and returns the identifier only when the token was valid and unexpired.
 */
export async function consumeToken(
  raw: string,
  type: TokenType,
): Promise<string | null> {
  const row = await prisma.verificationToken.findUnique({
    where: { tokenHash: sha256(raw) },
  });
  if (!row || row.type !== type) return null;
  // deleteMany (not delete) is race-safe: two concurrent clicks on the same
  // link both find the row, but only one delete affects a row. The loser sees
  // count 0 and is treated as an already-consumed (invalid) token.
  const { count } = await prisma.verificationToken.deleteMany({ where: { id: row.id } });
  if (count === 0) return null;
  if (row.expiresAt < new Date()) return null;
  return row.identifier;
}
