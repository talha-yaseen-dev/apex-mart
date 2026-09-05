import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => import("./helpers/db-mock"));
vi.mock("@/lib/pwned", () => ({
  isPasswordPwned: async () => false,
  PWNED_PASSWORD_MESSAGE: "pwned",
}));
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

import { sendRegistrationCodeAction, createAccountAction } from "@/lib/actions/auth";
import {
  reset,
  findUserByEmail,
  allTokens,
  allUsers,
  seedUser,
  failNextCreate,
} from "./helpers/db-mock";

const PW = "Str0ng!Passw0rd";
const NAME = "Ada Lovelace";
const codeFrom = (to: string) => sent.find((m) => m.to === to)?.html.match(/>(\d{6})<\/div>/)?.[1];

beforeEach(() => {
  reset();
  sent.length = 0;
  limiter.clear();
});

async function send(email: string) {
  await sendRegistrationCodeAction({ name: NAME, email, password: PW });
  return codeFrom(email)!;
}

describe("Step 1 — send code validates all fields, creates NO user", () => {
  it("issues only a verification record; no User row (items 1, 2, 3)", async () => {
    const email = "reg@example.com";
    const res = await sendRegistrationCodeAction({ name: NAME, email, password: PW });
    expect(res.ok).toBe(true);
    expect(findUserByEmail(email)).toBeNull();
    expect(allTokens()).toHaveLength(1);
    expect(codeFrom(email)).toMatch(/^\d{6}$/);
  });

  it("rejects an invalid name server-side (no code sent)", async () => {
    const res = await sendRegistrationCodeAction({ name: "A", email: "n@example.com", password: PW });
    expect(res).toMatchObject({ ok: false, field: "name" });
    expect(allTokens()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("rejects a weak password server-side BEFORE emailing a code", async () => {
    const res = await sendRegistrationCodeAction({ name: NAME, email: "w@example.com", password: "weak" });
    expect(res).toMatchObject({ ok: false, field: "password" });
    expect(allTokens()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("never stores the plaintext password anywhere", async () => {
    await send("nostore@example.com");
    expect(JSON.stringify(allTokens())).not.toContain(PW);
    expect(JSON.stringify(allUsers())).not.toContain(PW); // (no users at all yet)
  });

  it("refuses to start for an already-active account", async () => {
    seedUser({ email: "taken@example.com", emailVerified: new Date() });
    const res = await sendRegistrationCodeAction({ name: NAME, email: "taken@example.com", password: PW });
    expect((res as { error: string }).error).toMatch(/already exists/i);
    expect(allTokens()).toHaveLength(0);
  });
});

describe("Step 2 — create account only after a valid code", () => {
  it("a wrong code does not create an account (item 4)", async () => {
    const email = "reg4@example.com";
    await send(email);
    const res = await createAccountAction({ name: NAME, email, password: PW, code: "000000" });
    expect(res.ok).toBe(false);
    expect(findUserByEmail(email)).toBeNull();
  });

  it("an expired code does not create an account (item 5)", async () => {
    const email = "reg5@example.com";
    const code = await send(email);
    allTokens()[0].expiresAt = new Date(Date.now() - 1000);
    const res = await createAccountAction({ name: NAME, email, password: PW, code });
    expect(res).toEqual({ ok: false, error: "This code has expired. Request a new code.", field: "code" });
    expect(findUserByEmail(email)).toBeNull();
  });

  it("a correct code creates exactly one verified CUSTOMER (items 6, 7, 15)", async () => {
    const email = "reg6@example.com";
    const code = await send(email);
    const res = await createAccountAction({ name: NAME, email, password: PW, code });
    expect(res).toEqual({ ok: true, email });
    expect(allUsers()).toHaveLength(1);
    const user = findUserByEmail(email)!;
    expect(user.emailVerified).toBeInstanceOf(Date);
    expect(user.role).toBe("CUSTOMER");
    expect(user.isEmployee).toBe(false);
    expect(user.passwordHash).toMatch(/^\$argon2/);
  });

  it("a consumed code cannot create a second account (repeated submit — items 8, 12)", async () => {
    const email = "reg8@example.com";
    const code = await send(email);
    expect((await createAccountAction({ name: NAME, email, password: PW, code })).ok).toBe(true);
    const again = await createAccountAction({ name: "Mallory", email, password: PW, code });
    expect(again.ok).toBe(false);
    expect(allUsers()).toHaveLength(1);
    expect(findUserByEmail(email)!.name).toBe(NAME);
  });

  it("an unexpected create failure rolls back — code preserved, no account (atomicity)", async () => {
    const email = "boom@example.com";
    const code = await send(email);
    failNextCreate(); // user.create throws inside the transaction
    await expect(createAccountAction({ name: NAME, email, password: PW, code })).rejects.toThrow();
    // The transaction rolled back: no user, and the still-valid code survives.
    expect(findUserByEmail(email)).toBeNull();
    expect(allTokens()).toHaveLength(1);
    // Retrying with the same code now succeeds (code was NOT destroyed).
    const res = await createAccountAction({ name: NAME, email, password: PW, code });
    expect(res.ok).toBe(true);
    expect(allUsers()).toHaveLength(1);
  });

  it("resend invalidates the old code; only the newest works (item 9)", async () => {
    const email = "reg9@example.com";
    const first = await send(email);
    sent.length = 0;
    limiter.clear(); // simulate the 60s cooldown elapsing
    const second = await send(email);
    expect(second).not.toBe(first);
    expect((await createAccountAction({ name: NAME, email, password: PW, code: first })).ok).toBe(false);
    expect(findUserByEmail(email)).toBeNull();
    expect((await createAccountAction({ name: NAME, email, password: PW, code: second })).ok).toBe(true);
  });

  it("a code issued for email A cannot create an account for email B (item 11)", async () => {
    const a = "alice@example.com";
    const codeA = await send(a);
    const res = await createAccountAction({ name: "Bob", email: "bob@example.com", password: PW, code: codeA });
    expect(res.ok).toBe(false);
    expect(findUserByEmail("bob@example.com")).toBeNull();
    expect((await createAccountAction({ name: "Alice", email: a, password: PW, code: codeA })).ok).toBe(true);
  });

  it("rejects creation for an already-active email (race / item 12)", async () => {
    const email = "dup@example.com";
    const code = await send(email);
    seedUser({ email, emailVerified: new Date() });
    const res = await createAccountAction({ name: NAME, email, password: PW, code });
    expect((res as { error: string }).error).toMatch(/already exists/i);
  });

  it("re-validates the password policy at creation, not just at send", async () => {
    const email = "weak2@example.com";
    const code = await send(email);
    const res = await createAccountAction({ name: NAME, email, password: "weak", code });
    expect(res).toMatchObject({ ok: false, field: "password" });
    expect(findUserByEmail(email)).toBeNull();
  });
});

describe("legacy unverified account (compatibility — item 4/duplicate-safety)", () => {
  it("activates an existing emailVerified=null row in place, never duplicating", async () => {
    const email = "legacy@example.com";
    // Pre-existing unverified row (e.g. left by an older flow).
    seedUser({ email, name: "Old", emailVerified: null, passwordHash: "!google", id: "legacy1" });
    const code = await send(email); // allowed — not an ACTIVE account
    const res = await createAccountAction({ name: "Legacy User", email, password: PW, code });
    expect(res).toEqual({ ok: true, email });
    expect(allUsers()).toHaveLength(1); // same row, no duplicate
    const user = findUserByEmail(email)!;
    expect(user.id).toBe("legacy1");
    expect(user.emailVerified).toBeInstanceOf(Date);
    expect(user.passwordHash).toMatch(/^\$argon2/);
  });
});
