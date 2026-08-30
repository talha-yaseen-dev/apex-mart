"use server";

import { TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { issueToken, consumeToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned";
import { sendEmail } from "@/lib/email";
import { verifyEmail, resetEmail } from "@/emails/auth-emails";
import {
  registerSchema,
  forgotSchema,
  resetSchema,
} from "@/lib/validations/auth";
import { DEMO_ACCOUNT_LOCK_MESSAGE, isDemoAccount } from "@/lib/auth-constants";

type ActionResult =
  | { ok: true; email?: string }
  | { ok: false; error: string; field?: string };


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
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
      },
    });
    const token = await issueToken(email, TokenType.EMAIL_VERIFY);
    const url = `${env.APP_URL}/api/auth/verify?token=${token}`;
    const { subject, html } = verifyEmail(name, url);
    await sendEmail({ to: email, subject, html });
  }

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
