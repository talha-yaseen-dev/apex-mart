"use server";

import { revalidatePath } from "next/cache";
import { Prisma, TokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { emailSchema } from "@/lib/validations/auth";
import {
  issueCode,
  consumeCode,
  isSixDigitCode,
  emailChangeIdentifier,
  clearPendingEmailChanges,
} from "@/lib/otp";
import { rateLimit, clearRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { sendEmail } from "@/lib/email";
import { emailChangeCodeEmail, emailChangedNoticeEmail } from "@/emails/auth-emails";
import { maskEmail } from "@/lib/mask";
import { DEMO_ACCOUNT_LOCK_MESSAGE, isDemoAccount } from "@/lib/auth-constants";

/**
 * Settings → change email. A two-step, verified flow that works identically for
 * CUSTOMER and ADMIN (no separate admin path):
 *
 *   startEmailChangeAction  → reauthenticate, validate + reserve nothing, send a
 *                             6-digit code to the NEW address (User.email stays
 *                             the current verified address).
 *   verifyEmailChangeAction → consume the code, then atomically flip User.email
 *                             + emailVerified. Role and all other fields untouched.
 *
 * All trust comes from the authenticated session + database — never from client
 * input (no `reauthenticated: true`, no client-supplied userId/role/email).
 */

type Result = { ok: true } | { ok: false; error: string };

const COLLISION_MSG = "That email address is already associated with an account.";

class EmailTakenError extends Error {}
/** Aborts the change transaction on a failed code check, carrying the reason
 *  out so the right message can be returned after rollback. */
class CodeError extends Error {
  constructor(readonly reason: "invalid" | "expired") {
    super(reason);
  }
}

/** Acting user resolved from the session, with the fields we must trust from the DB. */
async function actingUser() {
  const session = await getCurrentUser();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });
}

export async function startEmailChangeAction(input: {
  newEmail: string;
  currentPassword?: string;
}): Promise<Result> {
  const user = await actingUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (isDemoAccount(user.email)) return { ok: false, error: DEMO_ACCOUNT_LOCK_MESSAGE };

  const parsed = emailSchema.safeParse(input?.newEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const newEmail = parsed.data;
  if (newEmail === user.email.toLowerCase()) {
    return { ok: false, error: "That’s already your account email." };
  }

  // ── Reauthentication — enforced server-side ──────────────────
  const hasPassword = user.passwordHash.startsWith("$argon2");
  if (!hasPassword) {
    // Google-only account (sentinel passwordHash). Blocked deliberately: there
    // is no password factor to reauthenticate with, AND identity is keyed by the
    // Google email in this architecture (no Account table), so moving the account
    // email would strand the Google login / risk a duplicate account. The user
    // must set a password first (Security section), which also gives them a
    // password login independent of Google.
    return {
      ok: false,
      error: "This account signs in with Google. Set a password first (in Security) to change your email.",
    };
  }
  const reauthed = await verifyPassword(user.passwordHash, input.currentPassword ?? "");
  if (!reauthed) return { ok: false, error: "Your current password is incorrect." };

  // ── Collision pre-check (the DB unique index is the real guard) ──
  const clash = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (clash && clash.id !== user.id) return { ok: false, error: COLLISION_MSG };

  // ── Rate-limit the SEND (anti email-bombing / unbounded codes) ──
  const ip = await clientIp();
  const [cooldown, hourly, byIp] = await Promise.all([
    rateLimit(`emailchange-cd:${user.id}`, 1, 60),
    rateLimit(`emailchange:${user.id}`, 5, 3600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`emailchange-ip:${ip}`, 15, 3600),
  ]);
  if (!cooldown.allowed) return { ok: false, error: "Please wait a minute before requesting another code." };
  if (!hourly.allowed || !byIp.allowed) return { ok: false, error: "Too many requests. Try again later." };

  // One pending change per user; fresh code resets the wrong-attempt lockout.
  await clearPendingEmailChanges(user.id);
  const code = await issueCode(emailChangeIdentifier(user.id, newEmail), TokenType.EMAIL_CHANGE);
  await clearRateLimit(`emailchange-attempt:${user.id}`);

  const { subject, html } = emailChangeCodeEmail(code);
  try {
    await sendEmail({ to: newEmail, subject, html });
  } catch {
    console.error("[email-change] code delivery failed");
  }
  return { ok: true };
}

export async function verifyEmailChangeAction(input: {
  newEmail: string;
  code: string;
}): Promise<Result> {
  const user = await actingUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = emailSchema.safeParse(input?.newEmail);
  if (!parsed.success || !isSixDigitCode(input?.code)) {
    return { ok: false, error: "Enter the 6-digit code we sent to your new email." };
  }
  const newEmail = parsed.data;

  // ── Brute-force protection ──
  const ip = await clientIp();
  const [attempts, byIp] = await Promise.all([
    rateLimit(`emailchange-attempt:${user.id}`, 5, 600),
    ip === "unknown" ? Promise.resolve({ allowed: true }) : rateLimit(`emailchange-vip:${ip}`, 30, 600),
  ]);
  if (!attempts.allowed || !byIp.allowed) return { ok: false, error: "Too many attempts. Request a new code." };

  // Capture the outgoing address BEFORE the update — the security alert must go
  // to the previous email, not the new one.
  const oldEmail = user.email;

  // ONE transaction: consume the code + flip the email together, with a final
  // uniqueness guard against a race where the target was claimed since the
  // pre-check. If the update fails, the consume rolls back and the still-valid
  // code is preserved. ONLY email + emailVerified change — role/isEmployee/
  // isPrimaryAdmin are never written, so an ADMIN stays ADMIN.
  try {
    await prisma.$transaction(async (tx) => {
      const res = await consumeCode(
        emailChangeIdentifier(user.id, newEmail),
        TokenType.EMAIL_CHANGE,
        input.code,
        tx,
      );
      if (!res.ok) throw new CodeError(res.reason);
      const clash = await tx.user.findUnique({ where: { email: newEmail }, select: { id: true } });
      if (clash && clash.id !== user.id) throw new EmailTakenError();
      await tx.user.update({
        where: { id: user.id },
        data: { email: newEmail, emailVerified: new Date() },
      });
    });
  } catch (e) {
    if (e instanceof CodeError) {
      return {
        ok: false,
        error:
          e.reason === "expired"
            ? "This code has expired. Request a new code."
            : "That code isn’t right. Check the 6 digits and try again.",
      };
    }
    if (
      e instanceof EmailTakenError ||
      (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    ) {
      return { ok: false, error: COLLISION_MSG };
    }
    throw e;
  }

  // Best-effort security alert to the OLD address — informational only, so a
  // delivery failure never rolls back a committed change (no code inside it).
  try {
    const { subject, html } = emailChangedNoticeEmail(maskEmail(newEmail));
    await sendEmail({ to: oldEmail, subject, html });
  } catch {
    /* non-fatal */
  }

  revalidatePath("/account/settings");
  return { ok: true };
}
