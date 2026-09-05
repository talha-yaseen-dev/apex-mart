import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenType } from "@prisma/client";

// The OTP module talks to the DB — back it with the in-memory double.
vi.mock("@/lib/db", () => import("./helpers/db-mock"));

import {
  generateCode,
  isSixDigitCode,
  issueCode,
  consumeCode,
  emailChangeIdentifier,
  clearPendingEmailChanges,
  CODE_TTL_MINUTES,
} from "@/lib/otp";
import { reset, allTokens } from "./helpers/db-mock";

beforeEach(() => reset());

describe("code generation (crypto)", () => {
  it("is always exactly six numeric digits and inside the crypto range", () => {
    for (let i = 0; i < 2000; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[0-9]{6}$/); // item 1
      const n = Number(c);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it("does not collapse to a constant (uses a real RNG, not a stub)", () => {
    // item 2 — sanity that randomInt actually varies across the space.
    const seen = new Set(Array.from({ length: 200 }, () => generateCode()));
    expect(seen.size).toBeGreaterThan(150);
  });

  it("validates the 6-digit shape strictly", () => {
    expect(isSixDigitCode("482731")).toBe(true);
    for (const bad of ["48273", "4827311", "48273a", "", " 482731", "12.456"]) {
      expect(isSixDigitCode(bad)).toBe(false);
    }
  });

  it("declares a 10-minute lifetime", () => {
    expect(CODE_TTL_MINUTES).toBe(10);
  });
});

describe("issue + consume", () => {
  const email = "person@example.com";

  it("stores only a keyed hash — never the plaintext code (item 3)", async () => {
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    const row = allTokens()[0];
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(row.tokenHash).not.toContain(code);
    expect(row.tokenHash).not.toBe(code);
    // The row's identifier is the email; the code appears nowhere in storage.
    expect(JSON.stringify(row)).not.toContain(code);
  });

  it("sets expiry ~10 minutes out (item 4)", async () => {
    const before = Date.now();
    await issueCode(email, TokenType.EMAIL_VERIFY);
    const exp = allTokens()[0].expiresAt.getTime();
    expect(exp - before).toBeGreaterThan(9 * 60_000);
    expect(exp - before).toBeLessThanOrEqual(10 * 60_000 + 1000);
  });

  it("verifies the correct code (item 5) and rejects a wrong one (item 6)", async () => {
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    expect(await consumeCode(email, TokenType.EMAIL_VERIFY, wrong)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await consumeCode(email, TokenType.EMAIL_VERIFY, code)).toEqual({
      ok: true,
      identifier: email,
    });
  });

  it("is single-use — a consumed code cannot be reused (item 7)", async () => {
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await consumeCode(email, TokenType.EMAIL_VERIFY, code)).ok).toBe(true);
    expect(await consumeCode(email, TokenType.EMAIL_VERIFY, code)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(allTokens()).toHaveLength(0);
  });

  it("rejects an expired code as 'expired' (item 8)", async () => {
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    allTokens()[0].expiresAt = new Date(Date.now() - 1000); // server time is authoritative
    expect(await consumeCode(email, TokenType.EMAIL_VERIFY, code)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rotates: issuing a new code invalidates the previous one (items 9, 10)", async () => {
    const first = await issueCode(email, TokenType.EMAIL_VERIFY);
    const second = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect(second).not.toBe(first);
    expect(allTokens()).toHaveLength(1); // only the newest survives
    expect((await consumeCode(email, TokenType.EMAIL_VERIFY, first)).ok).toBe(false);
    expect((await consumeCode(email, TokenType.EMAIL_VERIFY, second)).ok).toBe(true);
  });
});

describe("purpose + identity isolation (items 27, 28, 15)", () => {
  it("a code is bound to its type — cannot cross EMAIL_VERIFY ↔ EMAIL_CHANGE", async () => {
    const verifyId = "user@example.com";
    const vCode = await issueCode(verifyId, TokenType.EMAIL_VERIFY);
    // Same code value, wrong purpose → no match.
    expect((await consumeCode(verifyId, TokenType.EMAIL_CHANGE, vCode)).ok).toBe(false);

    const changeId = emailChangeIdentifier("user_1", "new@example.com");
    const cCode = await issueCode(changeId, TokenType.EMAIL_CHANGE);
    expect((await consumeCode(changeId, TokenType.EMAIL_VERIFY, cCode)).ok).toBe(false);
    // Correct purpose + identity still works.
    expect((await consumeCode(changeId, TokenType.EMAIL_CHANGE, cCode)).ok).toBe(true);
  });

  it("a code is bound to its identifier — another user's identifier cannot consume it", async () => {
    const aCode = await issueCode(emailChangeIdentifier("userA", "shared@example.com"), TokenType.EMAIL_CHANGE);
    // User B, same target email, different userId → different binding.
    expect(
      (await consumeCode(emailChangeIdentifier("userB", "shared@example.com"), TokenType.EMAIL_CHANGE, aCode)).ok,
    ).toBe(false);
  });

  it("clearPendingEmailChanges drops only that user's pending change codes", async () => {
    await issueCode(emailChangeIdentifier("userA", "a1@example.com"), TokenType.EMAIL_CHANGE);
    await issueCode(emailChangeIdentifier("userB", "b1@example.com"), TokenType.EMAIL_CHANGE);
    await clearPendingEmailChanges("userA");
    const remaining = allTokens();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].identifier.startsWith("userb:")).toBe(true);
  });
});
