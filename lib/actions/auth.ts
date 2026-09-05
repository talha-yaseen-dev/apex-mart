"use server";

import { Prisma, TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { issueToken, consumeToken } from "@/lib/tokens";
import { issueCode, consumeCode, isSixDigitCode } from "@/lib/otp";
import { rateLimit, clearRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned";
import { sendEmail } from "@/lib/email";
import { verifyCodeEmail, resetEmail } from "@/emails/auth-emails";
import {
  registerSchema,
  forgotSchema,
  resetSchema,
  emailSchema,
} from "@/lib/validations/auth";
import { DEMO_ACCOUNT_LOCK_MESSAGE, isDemoAccount } from "@/lib/auth-constants";

type ActionResult =
  | { ok: true; email?: string }
  | { ok: false; error: string; field?: string };

/**
 * Issue a fresh EMAIL_VERIFY 6-digit code and email it. Best-effort delivery:
 * the account is inactive until verified (sign-in is refused), and the user can
 * trigger a resend — so a transient email failure never blocks the flow or leaks
 * provider errors / the address's existence. Issuing a new code invalidates the
 * previous one AND resets its wrong-attempt lockout. Never logs the code.
 */
async function sendVerification(email: string, name: string): Promise<void> {
  const code = await issueCode(email, TokenType.EMAIL_VERIFY);
  await clearRateLimit(`verify-attempt:${email}`);
  const { subject, html } = verifyCodeEmail(name, code);
  try {
    await sendEmail({ to: email, subject, html });
  } catch {
    console.error("[auth] verification email delivery failed");
  }
}

/**
 * Resend a verification code for a pre-existing UNVERIFIED account (legacy /
 * compatibility only — NEW registrations never create a User before the code is
 * verified; see sendRegistrationCodeAction / createAccountAction). Powers the
 * standalone /verify-email screen an unverified sign-in is routed to.
 * Enumeration-safe (always neutral) and rate-limited on three axes.
 * (always neutral) and rate-limited on three axes to prevent email bombing and
 * unbounded token generation: a 60s per-address cooldown, an hourly per-address
 * cap, and an hourly per-IP cap.
 */
export async function resendVerificationAction(input: {
  email: string;
}): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email.", field: "email" };
  }
  const { email } = parsed.data;

  const ip = await clientIp();
  const [cooldown, hourly, byIp] = await Promise.all([
    rateLimit(`resend-cd:${email}`, 1, 60), // one send per 60s per address
    rateLimit(`resend:${email}`, 5, 3600), // at most 5/hour per address
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`resend-ip:${ip}`, 20, 3600),
  ]);
  if (cooldown.allowed && hourly.allowed && byIp.allowed) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified && !user.isGuest) {
      await sendVerification(email, user.name);
    }
  }
  // Neutral regardless: don't reveal existence/verification state or throttling.
  return { ok: true, email };
}

/**
 * Step 1 of web registration: validate ALL three fields, then issue a 6-digit
 * code to the email BEFORE any account exists. Creates NO User row — only a
 * VerificationToken (code hash) bound to the exact normalized email +
 * EMAIL_VERIFY purpose, expiring in 10 minutes. Rotates any prior code and
 * resets its wrong-attempt lockout. Rate-limited (60s cooldown + hourly cap per
 * email, plus a per-IP ceiling).
 *
 * Name + password are validated (policy + breach check) so a user with an
 * unacceptable password never receives an email only to be rejected later. The
 * password is validated transiently and NEVER stored/logged here — the client
 * keeps it until Create account, which re-validates authoritatively.
 */
export async function sendRegistrationCodeAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: input?.name,
    email: input?.email,
    password: input?.password,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the form.", field: String(issue?.path[0] ?? "") };
  }
  const { name, email, password } = parsed.data;

  if (await isPasswordPwned(password)) {
    return { ok: false, error: PWNED_PASSWORD_MESSAGE, field: "password" };
  }

  // Don't start a verification for an address that already has an ACTIVE account.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return {
      ok: false,
      error: "An account with this email already exists. Sign in instead.",
      field: "email",
    };
  }

  const ip = await clientIp();
  const [cooldown, hourly, byIp] = await Promise.all([
    rateLimit(`regcode-cd:${email}`, 1, 60),
    rateLimit(`regcode:${email}`, 5, 3600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`regcode-ip:${ip}`, 20, 3600),
  ]);
  if (!cooldown.allowed) {
    return { ok: false, error: "Please wait a moment before requesting another code." };
  }
  if (!hourly.allowed || !byIp.allowed) {
    return { ok: false, error: "Too many attempts. Please wait before trying again." };
  }

  const code = await issueCode(email, TokenType.EMAIL_VERIFY);
  await clearRateLimit(`regverify-attempt:${email}`);
  const { subject, html } = verifyCodeEmail(name, code);
  try {
    await sendEmail({ to: email, subject, html });
  } catch {
    return { ok: false, error: "We couldn’t send the verification code. Please try again." };
  }
  return { ok: true, email };
}

/**
 * Step 2 of web registration: create the account, but only after the emailed
 * code checks out. Re-validates every field server-side (name/email/password
 * policy — never trusting the send-code step), enforces the code against the
 * EXACT normalized email + EMAIL_VERIFY purpose + 10-min expiry + attempt
 * limits, consumes it atomically, then creates the User with emailVerified set.
 * Race-safe: the atomic consume + the DB unique(email) constraint guarantee one
 * code/email can never yield two accounts. Never auto-signs-in; never sets role
 * (so public registration can't create an ADMIN).
 */
export async function createAccountAction(input: {
  name: string;
  email: string;
  password: string;
  code: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: input?.name,
    email: input?.email,
    password: input?.password,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the form.", field: String(issue?.path[0] ?? "") };
  }
  const { name, email, password } = parsed.data;
  if (!isSixDigitCode(input?.code)) {
    return { ok: false, error: "Enter the 6-digit code from your email.", field: "code" };
  }
  if (await isPasswordPwned(password)) {
    return { ok: false, error: PWNED_PASSWORD_MESSAGE, field: "password" };
  }

  // Already-active account → don't burn the code; send them to sign-in.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerified) {
    return {
      ok: false,
      error: "An account with this email already exists. Sign in instead.",
      field: "email",
    };
  }

  const ip = await clientIp();
  const [attempts, byIp] = await Promise.all([
    rateLimit(`regverify-attempt:${email}`, 5, 600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`regverify-ip:${ip}`, 30, 600),
  ]);
  if (!attempts.allowed || !byIp.allowed) {
    return { ok: false, error: "Too many attempts. Please wait before trying again." };
  }

  // Hash BEFORE the transaction (argon2 is slow; keep the tx short).
  const passwordHash = await hashPassword(password);

  // Consume the code and create the account in ONE transaction: the code's
  // single-use delete and the User insert commit together, or neither does. So
  // an unexpected failure of the insert rolls the consume back and preserves the
  // still-valid code, while the atomic delete + the DB unique(email) constraint
  // guarantee one code/email can never yield two accounts.
  try {
    await prisma.$transaction(async (tx) => {
      const res = await consumeCode(email, TokenType.EMAIL_VERIFY, input.code, tx);
      if (!res.ok) throw new CodeError(res.reason);
      if (existing) {
        // A pre-existing UNVERIFIED row (legacy / compatibility) — activate it in
        // place rather than duplicating. The valid code proves address control,
        // so setting the password here is safe.
        await tx.user.update({
          where: { id: existing.id },
          data: { name, passwordHash, emailVerified: new Date() },
        });
      } else {
        await tx.user.create({
          data: { name, email, passwordHash, emailVerified: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof CodeError) {
      return {
        ok: false,
        error:
          e.reason === "expired"
            ? "This code has expired. Request a new code."
            : "That verification code is incorrect.",
        field: "code",
      };
    }
    // Final race guard: unique(email) means a concurrent creation can't duplicate.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "An account with this email already exists. Sign in instead.",
        field: "email",
      };
    }
    throw e;
  }

  return { ok: true, email };
}

/** Aborts the registration transaction when the code check fails, carrying the
 *  reason out so the caller can return the right message after rollback. */
class CodeError extends Error {
  constructor(readonly reason: "invalid" | "expired") {
    super(reason);
  }
}

/**
 * Verify a newly-registered email with its 6-digit code. Unauthenticated by
 * design — possession of the code emailed to the address is the proof of
 * ownership. Brute-force protected: 5 attempts / 10 min per address plus a
 * per-IP ceiling; on success emailVerified is set. Server time is authoritative
 * for expiry; the raw code is never logged or echoed back. Retained for the
 * standalone /verify-email screen (activating a pre-existing unverified account,
 * e.g. one created via the REST endpoint).
 */
export async function verifyEmailCodeAction(input: {
  email: string;
  code: string;
}): Promise<ActionResult> {
  const emailParsed = emailSchema.safeParse(input?.email);
  if (!emailParsed.success || !isSixDigitCode(input?.code)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  const email = emailParsed.data;

  const ip = await clientIp();
  const [attempts, byIp] = await Promise.all([
    rateLimit(`verify-attempt:${email}`, 5, 600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`verify-ip:${ip}`, 30, 600),
  ]);
  if (!attempts.allowed || !byIp.allowed) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const res = await consumeCode(email, TokenType.EMAIL_VERIFY, input.code);
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.reason === "expired"
          ? "This code has expired. Request a new code."
          : "That code isn’t right. Check the 6 digits and try again.",
    };
  }

  // Idempotent; an account deleted between issue and verify is treated as a
  // no-op (the code was single-use and is now gone either way).
  await prisma.user
    .update({ where: { email }, data: { emailVerified: new Date() } })
    .catch(() => {});
  return { ok: true, email };
}

/**
 * Forgot password — always advances to the "sent" screen (valid email or not).
 */
export async function forgotPasswordAction(input: {
  email: string;
}): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email.", field: "email" };
  }
  const { email } = parsed.data;

  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`forgot:${email}`, 5, 3600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`forgot-ip:${ip}`, 15, 3600),
  ]);
  if (byEmail.allowed && byIp.allowed) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await issueToken(email, TokenType.PASSWORD_RESET);
      const url = `${env.APP_URL}/reset?token=${token}`;
      const { subject, html } = resetEmail(url);
      await sendEmail({ to: email, subject, html });
    }
  }

  return { ok: true, email };
}

/**
 * Reset password — validates the single-use token, re-hashes with argon2, and
 * (with JWT sessions) forces re-login by rotating the password.
 */
export async function resetPasswordAction(input: {
  token: string;
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input.", field: String(issue?.path[0] ?? "") };
  }
  const { token, password } = parsed.data;

  if (await isPasswordPwned(password)) {
    return { ok: false, error: PWNED_PASSWORD_MESSAGE, field: "password" };
  }

  // A reset link and a team-invite link both land here — an invite is just the
  // first-time equivalent of a reset. consumeToken is a no-op on type mismatch,
  // so trying both is safe and single-use.
  const email =
    (await consumeToken(token, TokenType.PASSWORD_RESET)) ??
    (await consumeToken(token, TokenType.INVITE));
  if (!email) {
    return { ok: false, error: "This link is invalid or has expired." };
  }

  // Security: shared demo accounts have fixed, publicly-listed passwords. Refuse
  // resets so a visitor can't rotate the password and lock everyone else out.
  if (isDemoAccount(email)) {
    return { ok: false, error: DEMO_ACCOUNT_LOCK_MESSAGE };
  }

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: await hashPassword(password),
      emailVerified: new Date(), // resetting proves ownership of the address
    },
  });

  return { ok: true };
}
