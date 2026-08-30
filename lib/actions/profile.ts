"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { strongPasswordSchema } from "@/lib/validations/auth";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned";
import { DEMO_ACCOUNT_LOCK_MESSAGE, isDemoAccount } from "@/lib/auth-constants";

/** Update the signed-in user's display name and optional profile picture. */
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
  // undefined = leave unchanged; "" = remove the picture; else a data/URL image.
  image: z.string().trim().max(3_000_000).optional(),
});

export async function updateProfileAction(input: { name: string; image?: string }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.image !== undefined ? { image: parsed.data.image || null } : {}),
    },
  });
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
