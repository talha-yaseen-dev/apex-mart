import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters (OWASP baseline). Kept in sync with prisma/seed.ts.
 */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2);
}

export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashed, password, ARGON2);
  } catch {
    return false;
  }
}
