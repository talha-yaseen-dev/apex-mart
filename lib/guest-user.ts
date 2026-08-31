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

  let userId: string;
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    if (!existing.isGuest) {
      throw new GuestCheckoutError(
        "This phone belongs to a registered account — please sign in.",
      );
    }
    await prisma.user.update({ where: { id: existing.id }, data: { name } });
    userId = existing.id;
  } else {
    const digits = phone.replace(/[^\d]/g, "");
    // Synthetic unique email — the real contact email is passed to the order for
    // the receipt, not stored here (avoids colliding with a real account email).
    const created = await prisma.user.create({
      data: {
        name,
        phone,
        email: `guest.${digits}@mart.local`,
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
