import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenType } from "@prisma/client";

vi.mock("@/lib/db", () => import("./helpers/db-mock"));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Controllable authenticated session.
let currentSession: { id: string } | null = null;
vi.mock("@/lib/session", () => ({ getCurrentUser: async () => currentSession }));

// Capture email; deterministic limiter.
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

import { startEmailChangeAction, verifyEmailChangeAction } from "@/lib/actions/email-change";
import { issueCode, emailChangeIdentifier } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { reset, seedUser, findUserByEmail, allTokens, failNextUpdate } from "./helpers/db-mock";

const PW = "Secret123!pw";
let pwHash = "";

beforeEach(async () => {
  reset();
  sent.length = 0;
  limiter.clear();
  currentSession = null;
  if (!pwHash) pwHash = await hashPassword(PW);
});

function codeFrom(to: string): string | undefined {
  return sent.find((m) => m.to === to)?.html.match(/>(\d{6})<\/div>/)?.[1];
}

/** Seed a password-backed user and sign them in. */
function signInPasswordUser(over: Record<string, unknown> = {}) {
  const u = seedUser({ email: "old@example.com", name: "Owner", passwordHash: pwHash, ...over });
  currentSession = { id: u.id };
  return u;
}

describe("starting an email change", () => {
  it("rejects an unauthenticated caller (item 14)", async () => {
    currentSession = null;
    expect(await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW })).toEqual({
      ok: false,
      error: "Please sign in.",
    });
  });

  it("requires the correct current password (item 15)", async () => {
    signInPasswordUser();
    const res = await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: "wrong" });
    expect(res).toEqual({ ok: false, error: "Your current password is incorrect." });
    // No code issued for a failed reauth.
    expect(allTokens()).toHaveLength(0);
  });

  it("sends the code to the NEW email, and does NOT change User.email yet (items 16, 17)", async () => {
    const u = signInPasswordUser();
    const res = await startEmailChangeAction({ newEmail: "New@Example.com", currentPassword: PW });
    expect(res).toEqual({ ok: true });
    // Code went to the new address, not the old one.
    expect(codeFrom("new@example.com")).toMatch(/^\d{6}$/);
    expect(sent.some((m) => m.to === "old@example.com")).toBe(false);
    // Account email unchanged, still verified as the old address.
    expect(findUserByEmail("old@example.com")).toBeTruthy();
    expect(u.email).toBe("old@example.com");
  });

  it("blocks a Google-only (password-less) account with guidance (items 30, 32)", async () => {
    seedUser({ email: "google@example.com", passwordHash: "!google", id: "g1" });
    currentSession = { id: "g1" };
    const res = await startEmailChangeAction({ newEmail: "new@example.com" });
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toMatch(/signs in with Google/i);
    expect(allTokens()).toHaveLength(0);
  });

  it("rejects a target email already used by another account (item 23)", async () => {
    signInPasswordUser();
    seedUser({ email: "taken@example.com", id: "other" });
    const res = await startEmailChangeAction({ newEmail: "taken@example.com", currentPassword: PW });
    expect(res).toEqual({ ok: false, error: "That email address is already associated with an account." });
  });
});

describe("verifying an email change", () => {
  it("changes User.email + marks verified on the correct code (item 20)", async () => {
    const u = signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    const code = codeFrom("new@example.com")!;

    const res = await verifyEmailChangeAction({ newEmail: "new@example.com", code });
    expect(res).toEqual({ ok: true });
    expect(u.email).toBe("new@example.com");
    expect(u.emailVerified).toBeInstanceOf(Date);
    // Security alert went to the OLD address (no code inside — item 17 style).
    const alert = sent.find((m) => m.to === "old@example.com");
    expect(alert).toBeTruthy();
    expect(alert!.html).not.toMatch(/>\d{6}<\/div>/);
  });

  it("does not change the email on a wrong code (item 18)", async () => {
    const u = signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    const res = await verifyEmailChangeAction({ newEmail: "new@example.com", code: "000000" });
    expect(res.ok).toBe(false);
    expect(u.email).toBe("old@example.com");
  });

  it("does not change the email on an expired code (item 19)", async () => {
    const u = signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    // Force the stored code to be expired.
    allTokens()[0].expiresAt = new Date(Date.now() - 1000);
    const code = codeFrom("new@example.com")!;
    const res = await verifyEmailChangeAction({ newEmail: "new@example.com", code });
    expect(res).toEqual({ ok: false, error: "This code has expired. Request a new code." });
    expect(u.email).toBe("old@example.com");
  });

  it("cannot reuse a consumed email-change code (item 21)", async () => {
    const u = signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    const code = codeFrom("new@example.com")!;
    expect((await verifyEmailChangeAction({ newEmail: "new@example.com", code })).ok).toBe(true);
    // Change back attempt with the same (now consumed) code fails.
    currentSession = { id: u.id };
    expect((await verifyEmailChangeAction({ newEmail: "new@example.com", code })).ok).toBe(false);
  });

  it("resend rotates the change code — old fails, newest works (item 22)", async () => {
    signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    const first = codeFrom("new@example.com")!;
    sent.length = 0;
    limiter.clear(); // simulate the 60s send-cooldown elapsing
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW }); // resend
    const second = codeFrom("new@example.com")!;
    expect(second).not.toBe(first);
    expect((await verifyEmailChangeAction({ newEmail: "new@example.com", code: first })).ok).toBe(false);
    expect((await verifyEmailChangeAction({ newEmail: "new@example.com", code: second })).ok).toBe(true);
  });

  it("an unexpected update failure rolls back — code preserved, email unchanged (atomicity)", async () => {
    const u = signInPasswordUser();
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    const code = codeFrom("new@example.com")!;
    failNextUpdate(); // tx.user.update throws inside the transaction
    await expect(verifyEmailChangeAction({ newEmail: "new@example.com", code })).rejects.toThrow();
    // Rolled back: email unchanged AND the code survives for a retry.
    expect(findUserByEmail("old@example.com")).toBeTruthy();
    expect(findUserByEmail("new@example.com")).toBeNull();
    expect(allTokens()).toHaveLength(1);
    // The preserved code still works on retry.
    const retry = await verifyEmailChangeAction({ newEmail: "new@example.com", code });
    expect(retry).toEqual({ ok: true });
    expect(findUserByEmail("new@example.com")).toBeTruthy();
    expect(findUserByEmail("old@example.com")).toBeNull();
  });

  it("an EMAIL_VERIFY code cannot complete an email change (items 15/27/28)", async () => {
    const u = signInPasswordUser();
    // A registration-purpose code for the same target address must not work here.
    const wrongPurpose = await issueCode(
      emailChangeIdentifier(u.id, "new@example.com"),
      TokenType.EMAIL_VERIFY,
    );
    const res = await verifyEmailChangeAction({ newEmail: "new@example.com", code: wrongPurpose });
    expect(res.ok).toBe(false);
    expect(u.email).toBe("old@example.com");
  });
});

describe("role is never touched (items 24, 25, 26)", () => {
  it("a CUSTOMER stays CUSTOMER after changing email", async () => {
    const u = signInPasswordUser({ role: "CUSTOMER", isEmployee: false });
    await startEmailChangeAction({ newEmail: "new@example.com", currentPassword: PW });
    await verifyEmailChangeAction({ newEmail: "new@example.com", code: codeFrom("new@example.com")! });
    expect(u.email).toBe("new@example.com");
    expect(u.role).toBe("CUSTOMER");
    expect(u.isEmployee).toBe(false);
  });

  it("an ADMIN stays ADMIN (role + isEmployee + isPrimaryAdmin preserved)", async () => {
    const u = signInPasswordUser({
      email: "admin-old@example.com",
      role: "ADMIN",
      isEmployee: true,
      isPrimaryAdmin: true,
    });
    await startEmailChangeAction({ newEmail: "admin-new@example.com", currentPassword: PW });
    const res = await verifyEmailChangeAction({
      newEmail: "admin-new@example.com",
      code: codeFrom("admin-new@example.com")!,
    });
    expect(res).toEqual({ ok: true });
    expect(u.email).toBe("admin-new@example.com");
    expect(u.role).toBe("ADMIN"); // authorization stays put
    expect(u.isEmployee).toBe(true);
    expect(u.isPrimaryAdmin).toBe(true);
  });
});
