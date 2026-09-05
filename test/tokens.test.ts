import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "node:crypto";

// In-memory stand-in for the VerificationToken table.
type Row = { id: string; identifier: string; type: string; tokenHash: string; expiresAt: Date };
const rows: Row[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    verificationToken: {
      deleteMany: vi.fn(async ({ where }: { where: { id?: string; identifier?: string; type?: string } }) => {
        let count = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          const match =
            where.id != null ? r.id === where.id : r.identifier === where.identifier && r.type === where.type;
          if (match) {
            rows.splice(i, 1);
            count++;
          }
        }
        return { count };
      }),
      create: vi.fn(async ({ data }: { data: Omit<Row, "id"> }) => {
        const row: Row = { id: `tok_${rows.length}_${Math.random().toString(36).slice(2)}`, ...data };
        rows.push(row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) =>
        rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
      ),
    },
  },
}));

import { issueToken, consumeToken } from "@/lib/tokens";
import { TokenType } from "@prisma/client";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  rows.length = 0;
});

describe("verification tokens", () => {
  it("stores only the SHA-256 hash, never the raw token", async () => {
    const raw = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toBe(sha256(raw));
    expect(JSON.stringify(rows[0])).not.toContain(raw);
  });

  it("consumes successfully exactly once (single-use / replay-safe)", async () => {
    const raw = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    expect(await consumeToken(raw, TokenType.EMAIL_VERIFY)).toBe("user@x.com");
    expect(await consumeToken(raw, TokenType.EMAIL_VERIFY)).toBeNull();
    expect(rows).toHaveLength(0);
  });

  it("rejects an expired token", async () => {
    const raw = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    rows[0].expiresAt = new Date(Date.now() - 1000);
    expect(await consumeToken(raw, TokenType.EMAIL_VERIFY)).toBeNull();
  });

  it("rejects a token consumed under the wrong type (and leaves it usable)", async () => {
    const raw = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    expect(await consumeToken(raw, TokenType.PASSWORD_RESET)).toBeNull();
    expect(await consumeToken(raw, TokenType.EMAIL_VERIFY)).toBe("user@x.com");
  });

  it("rotates: issuing a fresh token invalidates the previous one (resend)", async () => {
    const first = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    const second = await issueToken("user@x.com", TokenType.EMAIL_VERIFY);
    expect(rows).toHaveLength(1);
    expect(await consumeToken(first, TokenType.EMAIL_VERIFY)).toBeNull();
    expect(await consumeToken(second, TokenType.EMAIL_VERIFY)).toBe("user@x.com");
  });
});
