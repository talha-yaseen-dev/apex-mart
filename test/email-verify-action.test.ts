import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TokenType } from "@prisma/client";

vi.mock("@/lib/db", () => import("./helpers/db-mock"));
const sent: Array<{ to: string; subject: string; html: string }> = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (o: { to: string; subject: string; html: string }) => {
    sent.push(o);
  },
}));
const limiter = new Map<string, number>();
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async (key: string, limit: number) => {
    const n = (limiter.get(key) ?? 0) + 1;
    limiter.set(key, n);
    return { allowed: n <= limit, remaining: Math.max(0, limit - n), retryAfter: 0 };
  },
  clearRateLimit: async (key: string) => {
    limiter.delete(key);
  },
}));

import { resendVerificationAction, verifyEmailCodeAction } from "@/lib/actions/auth";
import { issueCode } from "@/lib/otp";
import { reset, seedUser, findUserByEmail, allTokens } from "./helpers/db-mock";

beforeEach(() => {
  reset();
  sent.length = 0;
  limiter.clear();
});

/**
 * The COMPATIBILITY path for pre-existing UNVERIFIED accounts (e.g. left by an
 * older flow). New registration never creates a User before verification —
 * these actions only activate an account that already exists. Powers the
 * standalone /verify-email screen an unverified sign-in is routed to.
 */
describe("legacy verify — activates an existing unverified account", () => {
  it("marks emailVerified on the correct code (items 5, 13)", async () => {
    const email = "old1@example.com";
    seedUser({ email, emailVerified: null, passwordHash: "$argon2id$stub" });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await verifyEmailCodeAction({ email, code })).ok).toBe(true);
    expect(findUserByEmail(email)!.emailVerified).toBeInstanceOf(Date);
  });

  it("rejects a wrong code without verifying (item 6)", async () => {
    const email = "old2@example.com";
    seedUser({ email, emailVerified: null });
    await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await verifyEmailCodeAction({ email, code: "000000" })).ok).toBe(false);
    expect(findUserByEmail(email)!.emailVerified).toBeNull();
  });

  it("rejects an expired code (item 8)", async () => {
    const email = "old3@example.com";
    seedUser({ email, emailVerified: null });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    allTokens()[0].expiresAt = new Date(Date.now() - 1000);
    expect(await verifyEmailCodeAction({ email, code })).toEqual({
      ok: false,
      error: "This code has expired. Request a new code.",
    });
  });

  it("is single-use (item 7)", async () => {
    const email = "old4@example.com";
    seedUser({ email, emailVerified: null });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await verifyEmailCodeAction({ email, code })).ok).toBe(true);
    expect((await verifyEmailCodeAction({ email, code })).ok).toBe(false);
  });

  it("blocks after too many wrong attempts (item 11)", async () => {
    const email = "old5@example.com";
    seedUser({ email, emailVerified: null });
    await issueCode(email, TokenType.EMAIL_VERIFY);
    for (let i = 0; i < 5; i++) {
      const r = await verifyEmailCodeAction({ email, code: "111111" });
      expect((r as { error: string }).error).not.toMatch(/too many/i);
    }
    expect(await verifyEmailCodeAction({ email, code: "111111" })).toEqual({
      ok: false,
      error: "Too many attempts. Request a new code.",
    });
  });
});

describe("legacy resend", () => {
  it("rotates the code for an unverified account (items 9, 10)", async () => {
    const email = "old6@example.com";
    seedUser({ email, emailVerified: null });
    const first = await issueCode(email, TokenType.EMAIL_VERIFY);
    await resendVerificationAction({ email });
    const second = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await verifyEmailCodeAction({ email, code: first })).ok).toBe(false);
    expect((await verifyEmailCodeAction({ email, code: second })).ok).toBe(true);
  });

  it("stays neutral and sends nothing for a verified/absent account", async () => {
    seedUser({ email: "verified@example.com", emailVerified: new Date() });
    expect((await resendVerificationAction({ email: "verified@example.com" })).ok).toBe(true);
    expect((await resendVerificationAction({ email: "nobody@example.com" })).ok).toBe(true);
    expect(sent).toHaveLength(0);
  });
});

describe("no code leakage (item 20)", () => {
  let logs: string[] = [];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logs = [];
    const cap = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
    logSpy = vi.spyOn(console, "log").mockImplementation(cap);
    errSpy = vi.spyOn(console, "error").mockImplementation(cap);
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("never writes a 6-digit code to the console during verify", async () => {
    const email = "old7@example.com";
    seedUser({ email, emailVerified: null });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    await verifyEmailCodeAction({ email, code });
    for (const line of logs) expect(line).not.toContain(code);
  });
});
