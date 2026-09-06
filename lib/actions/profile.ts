"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";
import { strongPasswordSchema } from "@/lib/validations/auth";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned";
import {
  DEMO_ACCOUNT_LOCK_MESSAGE,
  DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE,
  isDemoAccount,
} from "@/lib/auth-constants";

/** Update the signed-in user's display name, phone, and optional picture. */
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
  // undefined = leave unchanged; "" = clear the phone; else a phone to validate.
  phone: z.string().trim().optional(),
  // undefined = leave unchanged; "" = remove the picture; else a data/URL image.
  image: z.string().trim().max(3_000_000).optional(),
});

export async function updateProfileAction(input: { name: string; phone?: string; image?: string }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  // Phone is optional + unique (it doubles as the guest identity). Only touch it
  // when the caller sends the field; "" clears it, otherwise it must normalise.
  let phoneUpdate: { phone?: string | null } = {};
  if (parsed.data.phone !== undefined) {
    if (parsed.data.phone === "") {
      phoneUpdate = { phone: null };
    } else {
      const normalized = normalizePhone(parsed.data.phone);
      if (!normalized) {
        return { ok: false as const, error: "Enter a valid Pakistani phone number (e.g. 03001234567)." };
      }
      phoneUpdate = { phone: normalized };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        ...phoneUpdate,
        ...(parsed.data.image !== undefined ? { image: parsed.data.image || null } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false as const, error: "That phone number is already in use." };
    }
    throw e;
  }

  revalidatePath("/account/settings");
  return { ok: true as const };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: strongPasswordSchema,
    confirm: z.string().min(1),
  })
  .refine((v) => v.next === v.confirm, {
    message: "New passwords don’t match.",
    path: ["confirm"],
  });

/** Change password — verifies the current one before re-hashing the new. */
export async function changePasswordAction(input: {
  current: string;
  next: string;
  confirm: string;
}) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { ok: false as const, error: "Please sign in." };

  // Security: the shared demo accounts have fixed, publicly-listed passwords so
  // any visitor can sign in. Refusing changes here (and in resetPasswordAction)
  // stops one visitor from rotating the password and locking everyone else out
  // of the shared demo.
  if (isDemoAccount(sessionUser.email)) {
    return { ok: false as const, error: DEMO_ACCOUNT_LOCK_MESSAGE };
  }

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!dbUser) return { ok: false as const, error: "Account not found." };

  const valid = await verifyPassword(dbUser.passwordHash, parsed.data.current);
  if (!valid) return { ok: false as const, error: "Your current password is incorrect." };
  if (parsed.data.next === parsed.data.current) {
    return { ok: false as const, error: "Choose a password different from your current one." };
  }
  if (await isPasswordPwned(parsed.data.next)) {
    return { ok: false as const, error: PWNED_PASSWORD_MESSAGE };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  return { ok: true as const };
}

const setPasswordSchema = z
  .object({
    next: strongPasswordSchema,
    confirm: z.string().min(1, "Re-enter the password."),
  })
  .refine((v) => v.next === v.confirm, { message: "Passwords don’t match.", path: ["confirm"] });

/**
 * Set an initial password for an account that has none — i.e. one created via
 * Google sign-in (sentinel passwordHash "!google"). This lets the user sign in
 * with email + password instead of depending on Google. Accounts that already
 * have a real password must use changePasswordAction (which requires the current
 * one), so this can't be abused to bypass that check.
 */
export async function setInitialPasswordAction(input: { next: string; confirm: string }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { ok: false as const, error: "Please sign in." };
  if (isDemoAccount(sessionUser.email)) {
    return { ok: false as const, error: DEMO_ACCOUNT_LOCK_MESSAGE };
  }

  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  if (!dbUser) return { ok: false as const, error: "Account not found." };
  if (dbUser.passwordHash.startsWith("$argon2")) {
    return { ok: false as const, error: "This account already has a password — use Change password instead." };
  }
  if (await isPasswordPwned(parsed.data.next)) {
    return { ok: false as const, error: PWNED_PASSWORD_MESSAGE };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  revalidatePath("/account/settings");
  return { ok: true as const };
}

/**
 * Delete (close) the signed-in user's account. Deliberately a SOFT delete that
 * preserves the store's records: the account is deactivated (sign-in refused via
 * getCurrentUser) and the user's PRIVATE data — saved addresses, cart, wishlist —
 * is removed, but orders, payments and reviews are KEPT so admin retains the full
 * purchase/revenue history (and can even reactivate the account later).
 *
 * Reauthentication is enforced server-side: password accounts must supply their
 * current password; every caller must type the literal confirmation "DELETE".
 * The primary-admin (owner) account can't be deleted here.
 */
export async function deleteAccountAction(input: { password?: string; confirmText?: string }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { ok: false as const, error: "Please sign in." };
  if (isDemoAccount(sessionUser.email)) {
    return { ok: false as const, error: DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE };
  }
  if ((input?.confirmText ?? "").trim().toUpperCase() !== "DELETE") {
    return { ok: false as const, error: "Type DELETE to confirm." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true, isPrimaryAdmin: true, isEmployee: true, role: true },
  });
  if (!dbUser) return { ok: false as const, error: "Account not found." };
  // Admin/staff accounts can never be deleted — they gate the store's operations.
  if (dbUser.isEmployee || dbUser.role === "ADMIN" || dbUser.isPrimaryAdmin) {
    return { ok: false as const, error: "Admin accounts can't be deleted." };
  }

  // Password accounts must reauthenticate; Google-only accounts are gated by the
  // typed confirmation + their authenticated session (they have no password).
  if (dbUser.passwordHash.startsWith("$argon2")) {
    const ok = await verifyPassword(dbUser.passwordHash, input.password ?? "");
    if (!ok) return { ok: false as const, error: "Your current password is incorrect." };
  }

  await prisma.$transaction([
    prisma.address.deleteMany({ where: { userId: sessionUser.id } }),
    prisma.wishlist.deleteMany({ where: { userId: sessionUser.id } }),
    prisma.cart.deleteMany({ where: { userId: sessionUser.id } }),
    prisma.user.update({ where: { id: sessionUser.id }, data: { deactivatedAt: new Date() } }),
  ]);

  return { ok: true as const };
}
