import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TokenType } from "@prisma/client";

vi.mock("@/lib/db", () => import("./helpers/db-mock"));
// No network in tests; treat every password as un-breached.
vi.mock("@/lib/pwned", () => ({
  isPasswordPwned: async () => false,
  PWNED_PASSWORD_MESSAGE: "pwned",
}));
// Capture outgoing email instead of sending.
const sent: Array<{ to: string; subject: string; html: string }> = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (o: { to: string; subject: string; html: string }) => {
    sent.push(o);
  },
}));
// Deterministic, resettable rate limiter (fixed window) so tests don't bleed
// through the real module-level sliding-window Map.
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

import { registerAction, resendVerificationAction, verifyEmailCodeAction } from "@/lib/actions/auth";
import { issueCode } from "@/lib/otp";
import { reset, findUserByEmail, allTokens } from "./helpers/db-mock";

beforeEach(() => {
  reset();
  sent.length = 0;
  limiter.clear();
});

const strongPw = "Str0ng!Passw0rd";

describe("registration → unverified account + emailed code", () => {
  it("creates an INACTIVE account (emailVerified null) and emails a 6-digit code", async () => {
    const email = "reg1@example.com";
    const res = await registerAction({ name: "Ada", email, password: strongPw });
    expect(res.ok).toBe(true);

    const user = findUserByEmail(email);
    expect(user).toBeTruthy();
    // item 12/13 precondition: not verified merely because registration succeeded.
    expect(user!.emailVerified).toBeNull();

    // A code was emailed to that address...
    const mail = sent.find((m) => m.to === email);
    expect(mail).toBeTruthy();
    expect(mail!.html).toMatch(/>\d{6}<\/div>/); // the code block
    // ...and only its hash is stored (item 3).
    const stored = allTokens()[0];
    const emailedCode = mail!.html.match(/>(\d{6})<\/div>/)![1];
    expect(stored.tokenHash).not.toContain(emailedCode);
  });
});

describe("verify with the 6-digit code", () => {
  it("marks emailVerified on the correct code (items 5, 13)", async () => {
    const email = "reg2@example.com";
    await registerAction({ name: "Grace", email, password: strongPw });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY); // fresh, known code

    const res = await verifyEmailCodeAction({ email, code });
    expect(res.ok).toBe(true);
    expect(findUserByEmail(email)!.emailVerified).toBeInstanceOf(Date);
  });

  it("rejects a wrong code without verifying (item 6)", async () => {
    const email = "reg3@example.com";
    await registerAction({ name: "Xander", email, password: strongPw });
    await issueCode(email, TokenType.EMAIL_VERIFY);

    const res = await verifyEmailCodeAction({ email, code: "000000" });
    expect(res).toMatchObject({ ok: false });
    expect(findUserByEmail(email)!.emailVerified).toBeNull();
  });

  it("rejects an expired code with a clear message (item 8)", async () => {
    const email = "reg4@example.com";
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    allTokens()[0].expiresAt = new Date(Date.now() - 1000);
    const res = await verifyEmailCodeAction({ email, code });
    expect(res).toEqual({ ok: false, error: "This code has expired. Request a new code." });
  });

  it("cannot reuse a consumed code (item 7)", async () => {
    const email = "reg5@example.com";
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    expect((await verifyEmailCodeAction({ email, code })).ok).toBe(true);
    expect((await verifyEmailCodeAction({ email, code })).ok).toBe(false);
  });

  it("resend rotates the code — old fails, newest works (items 9, 10)", async () => {
    const email = "reg6@example.com";
    const first = await issueCode(email, TokenType.EMAIL_VERIFY);
    await resendVerificationAction({ email }); // issues a new one, invalidates `first`
    const second = await issueCode(email, TokenType.EMAIL_VERIFY); // known newest
    expect((await verifyEmailCodeAction({ email, code: first })).ok).toBe(false);
    expect((await verifyEmailCodeAction({ email, code: second })).ok).toBe(true);
  });

  it("blocks after too many wrong attempts (item 11)", async () => {
    const email = "reg7@example.com";
    await issueCode(email, TokenType.EMAIL_VERIFY);
    // 5 wrong attempts are allowed-but-wrong; the 6th is throttled.
    for (let i = 0; i < 5; i++) {
      const r = await verifyEmailCodeAction({ email, code: "111111" });
      expect(r).toMatchObject({ ok: false });
      expect((r as { error: string }).error).not.toMatch(/too many/i);
    }
    const blocked = await verifyEmailCodeAction({ email, code: "111111" });
    expect(blocked).toEqual({ ok: false, error: "Too many attempts. Request a new code." });
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

  it("never writes a 6-digit code to the console during register + verify", async () => {
    const email = "reg8@example.com";
    await registerAction({ name: "Zoe", email, password: strongPw });
    const code = await issueCode(email, TokenType.EMAIL_VERIFY);
    await verifyEmailCodeAction({ email, code });
    for (const line of logs) expect(line).not.toContain(code);
  });
});
