"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { fetchOrder } from "@/lib/order-access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isSyntheticEmail = (email: string) =>
  email.startsWith("guest.") && email.endsWith("@mart.local");

/**
 * Guest → account upsell on the confirmation page: set a password and a usable
 * login email, then clear the guest flag. Access is proven the same way the
 * page is (order-ref cookie or phone). If the account still has its synthetic
 * checkout email, a real email is required (pre-filled from checkout, or typed).
 */
export async function convertGuestToAccount(input: {
  ref: string;
  phone?: string;
  email?: string;
  password: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const password = (input.password ?? "").trim();
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const order = await fetchOrder(input.ref, input.phone ?? null);
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.isGuest) return { ok: false, error: "This account is already registered." };

  const user = await prisma.user.findUnique({
    where: { id: order.userId },
    select: { email: true },
  });
  if (!user) return { ok: false, error: "Order not found." };

  // Decide the login email. If the current one is still synthetic, a real email
  // must be supplied so the account can actually sign in.
  let emailToSet = user.email;
  if (isSyntheticEmail(user.email)) {
    const provided = (input.email ?? "").trim().toLowerCase();
    if (!provided) {
      return { ok: false, error: "Email is required to create your account." };
    }
    if (!EMAIL_RE.test(provided)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    const clash = await prisma.user.findUnique({
      where: { email: provided },
      select: { id: true },
    });
    if (clash && clash.id !== order.userId) {
      return { ok: false, error: "That email is already in use — please sign in instead." };
    }
    emailToSet = provided;
  }

  await prisma.user.update({
    where: { id: order.userId },
    data: {
      email: emailToSet,
      passwordHash: await hashPassword(password),
      isGuest: false,
    },
  });
  return { ok: true, email: emailToSet };
}
