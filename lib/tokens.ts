import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";

const TTL_MS: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24h
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
  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.deleteMany({ where: { identifier, type } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      type,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
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
  await prisma.verificationToken.delete({ where: { id: row.id } });
  if (row.expiresAt < new Date()) return null;
  return row.identifier;
}
