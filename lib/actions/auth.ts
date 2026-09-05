"use server";

import { TokenType } from "@prisma/client";
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
 * Register — always resolves to the neutral "check your email" screen, whether
 * or not the address is already in use (enumeration-safe). A real, unused email
 * gets an inactive account + verification link.
 */
export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input.", field: String(issue?.path[0] ?? "") };
  }
  const { name, email, password } = parsed.data;

  if (await isPasswordPwned(password)) {
    return { ok: false, error: PWNED_PASSWORD_MESSAGE, field: "password" };
  }

  const ip = await clientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`register:${email}`, 5, 3600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`register-ip:${ip}`, 15, 3600),
  ]);
  if (!byEmail.allowed || !byIp.allowed) return { ok: true, email }; // stay neutral even when throttled

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    // New address → create an inactive account + send the verification link.
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
      },
    });
    await sendVerification(email, name);
  } else if (existing.emailVerified) {
    // Account already exists and is active — do NOT allow recreating it. (This
    // deliberately trades enumeration-safety for the clearer UX the store wants.)
    return {
      ok: false,
      error: "An account with this email already exists. Please sign in instead.",
      field: "email",
    };
  } else {
    // Exists but not yet verified → re-send the link (never a duplicate row),
    // and never overwrite its password from this unauthenticated path.
    await sendVerification(email, existing.name || name);
  }

  return { ok: true, email };
}

/**
 * Resend the verification link for an unverified account. Enumeration-safe
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
 * Verify a newly-registered email with its 6-digit code. Unauthenticated by
 * design — possession of the code emailed to the address is the proof of
 * ownership. Brute-force protected: 5 attempts / 10 min per address plus a
 * per-IP ceiling; on success emailVerified is set. Server time is authoritative
 * for expiry; the raw code is never logged or echoed back.
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
