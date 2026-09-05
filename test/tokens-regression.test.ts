import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenType } from "@prisma/client";

vi.mock("@/lib/db", () => import("./helpers/db-mock"));

import { issueToken, consumeToken } from "@/lib/tokens";
import { reset } from "./helpers/db-mock";

beforeEach(() => reset());

/**
 * Regression guard for item 33 / section 21: moving EMAIL_VERIFY (and the new
 * EMAIL_CHANGE) onto 6-digit codes must NOT disturb the single-use LINK tokens
 * that password reset and team invites still rely on.
 */
describe("link tokens still work after the OTP migration", () => {
  it("PASSWORD_RESET issues + consumes once (single-use)", async () => {
    const raw = await issueToken("user@example.com", TokenType.PASSWORD_RESET);
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(20); // 32 random bytes, base64url
    expect(await consumeToken(raw, TokenType.PASSWORD_RESET)).toBe("user@example.com");
    expect(await consumeToken(raw, TokenType.PASSWORD_RESET)).toBeNull(); // reused → gone
  });

  it("INVITE tokens still round-trip", async () => {
    const raw = await issueToken("invitee@example.com", TokenType.INVITE);
    expect(await consumeToken(raw, TokenType.INVITE)).toBe("invitee@example.com");
  });

  it("a token cannot be consumed under the wrong type", async () => {
    const raw = await issueToken("user@example.com", TokenType.PASSWORD_RESET);
    expect(await consumeToken(raw, TokenType.INVITE)).toBeNull();
  });

  it("refuses to issue code-only token types as links (EMAIL_VERIFY / EMAIL_CHANGE)", async () => {
    await expect(issueToken("user@example.com", TokenType.EMAIL_VERIFY)).rejects.toThrow();
    await expect(issueToken("user@example.com", TokenType.EMAIL_CHANGE)).rejects.toThrow();
  });
});
