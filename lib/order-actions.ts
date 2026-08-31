"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { fetchOrder } from "@/lib/order-access";

/**
 * Guest → account upsell on the confirmation page: set a password and clear the
 * guest flag. Access is proven the same way the page is (order-ref cookie or
 * phone), so only the buyer can convert their own account. Name/phone are
 * already on the record; only the password is collected.
 */
export async function convertGuestToAccount(input: {
  ref: string;
  phone?: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const password = (input.password ?? "").trim();
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const order = await fetchOrder(input.ref, input.phone ?? null);
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.isGuest) return { ok: false, error: "This account is already registered." };

  await prisma.user.update({
    where: { id: order.userId },
    data: { passwordHash: await hashPassword(password), isGuest: false },
  });
  return { ok: true };
}
