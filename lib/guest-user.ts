import "server-only";
import { prisma } from "@/lib/db";
import { readCartCookie } from "@/lib/cart-cookie";
import { normalizePhone } from "@/lib/phone";

export class GuestCheckoutError extends Error {}

/**
 * Find-or-create the guest identity for checkout, keyed by phone. Also attaches
 * the current guest-cookie cart to the resolved user so Nova's checkout
 * (getCartViewFor(userId)) sees the items. No auth patching — guests get a
 * password-less account (isGuest=true) they can never sign into.
 */
export async function resolveGuestUser(input: {
  name: string;
  phone: string;
  email?: string;
}): Promise<{ userId: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new GuestCheckoutError("Please enter a valid Pakistani mobile number.");
  const name = input.name.trim();

  const digits = phone.replace(/[^\d]/g, "");
  let userId: string;

  // The checkout phone is delivery contact info only — it is NOT an identity
  // link to a registered account. Reuse a prior GUEST identity for this phone,
  // but never block on, reuse, or modify a registered account.
  const existingGuest = await prisma.user.findFirst({ where: { phone, isGuest: true } });
  if (existingGuest) {
    await prisma.user.update({ where: { id: existingGuest.id }, data: { name } });
    userId = existingGuest.id;
  } else {
    // If a registered account already holds this phone, keep it OFF the new
    // guest so the unique constraint doesn't collide and the order isn't
    // attributed to that account — the number is still captured on the order.
    const taken = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    const created = await prisma.user.create({
      data: {
        name,
        phone: taken ? null : phone,
        // Unique synthetic email — the real contact email is passed to the order
        // for the receipt, not stored here.
        email: `guest.${digits}.${Date.now().toString(36)}@mart.local`,
        passwordHash: "!guest", // not a valid argon2 hash → cannot sign in
        isGuest: true,
      },
    });
    userId = created.id;
  }

  // Claim the guest-cookie cart for this user (make it the user's only cart so
  // ensureUserCart resolves the right one).
  const guestCartId = await readCartCookie();
  if (guestCartId) {
    try {
      await prisma.cart.deleteMany({ where: { userId, id: { not: guestCartId } } });
      await prisma.cart.update({ where: { id: guestCartId }, data: { userId } });
    } catch {
      /* cart already claimed or gone — ignore */
    }
  }

  return { userId };
}
