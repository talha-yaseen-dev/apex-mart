"use server";

import { redirect } from "next/navigation";
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type PlaceOrderError,
} from "@/lib/checkout-schema";
import { resolveGuestUser, GuestCheckoutError } from "@/lib/guest-user";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { getCartViewFor } from "@/lib/api/cart";
import { createOrderFor, confirmOrderFor } from "@/lib/api/checkout";
import { clearCartCookie } from "@/lib/cart-cookie";
import { writeOrderRefCookie, writeOrderEmailCookie } from "@/lib/order-cookie";
import { FREE_DELIVERY_THRESHOLD_MINOR, zoneById } from "@/lib/delivery-config";

/**
 * Place a COD order as a guest. Validates, resolves the guest user (+ attaches
 * the cart), then reuses Nova's createOrderFor / confirmOrderFor — with the
 * storefront delivery fee and no tax (Option 2 override) — and redirects to the
 * confirmation. Returns an error object on failure; on success it redirects.
 */
export async function placeOrder(raw: CheckoutFormInput): Promise<PlaceOrderError> {
  const parsed = checkoutFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;

  // A signed-in shopper orders under their own account — their cart is keyed by
  // their user id (resolveCart), so we must use it (not a phone-keyed guest, or
  // the cart reads as empty). Guests resolve a guest identity + attach the
  // cookie cart.
  let userId: string;
  // Guests can't sign in (password-less accounts), so any signed-in user here is
  // a real account — order under it so their account cart is used.
  const currentUser = await getCurrentUser();
  if (currentUser) {
    userId = currentUser.id;
  } else {
    try {
      ({ userId } = await resolveGuestUser({
        name: d.name,
        phone: d.phone,
        email: d.email || undefined,
      }));
    } catch (e) {
      return {
        ok: false,
        error: e instanceof GuestCheckoutError ? e.message : "Could not process checkout.",
        ...(e instanceof GuestCheckoutError ? { fieldErrors: { phone: e.message } } : {}),
      };
    }
  }

  // Authoritative cart subtotal (the same view createOrderFor uses).
  const cart = await getCartViewFor(userId);
  if (cart.subtotalMinor <= 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const zone = zoneById(d.zoneId);
  const deliveryFeeOverride =
    cart.subtotalMinor >= FREE_DELIVERY_THRESHOLD_MINOR ? 0 : zone.feeMinor;

  // Order/Address have no slot/rider-note fields, so fold them into the address
  // free-text (persisted where the store can read them).
  const line2 = [d.area, d.riderNote && `Rider: ${d.riderNote}`, d.slot && `Slot: ${d.slot}`]
    .filter(Boolean)
    .join(" · ");
  const address = {
    name: d.name,
    line1: d.street,
    line2,
    city: d.city,
    region: zone.name,
    postalCode: "00000",
    country: "PK",
  };

  let orderNumber: string;
  try {
    const created = await createOrderFor(
      userId,
      d.email || "",
      { shipMethod: "standard", address },
      { deliveryFeeOverride, skipTax: true, currency: "PKR" },
    );
    // COD: confirm immediately (Stripe unconfigured → no online payment step).
    // Pass the real contact email so the receipt reaches the shopper.
    await confirmOrderFor(userId, created.orderId, "cod", d.email || undefined);
    orderNumber = created.orderNumber;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not place your order. Please try again.",
    };
  }

  // Empty the cart now the order is placed. For signed-in shoppers the cart is a
  // DB row keyed by their user id, so clearing the cookie alone leaves items
  // behind — delete the cart items explicitly.
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } }).catch(() => {});

  // Persist the delivery phone on the account so it shows in tracking / admin
  // (don't overwrite an existing number, and skip if another account holds it).
  try {
    const normalized = normalizePhone(d.phone);
    if (normalized) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
      if (me && !me.phone) {
        const taken = await prisma.user.findUnique({ where: { phone: normalized }, select: { id: true } });
        if (!taken) await prisma.user.update({ where: { id: userId }, data: { phone: normalized } });
      }
    }
  } catch {
    /* non-fatal — phone display is best-effort */
  }

  await clearCartCookie();
  // Grant the buyer access to their confirmation without re-entering a phone,
  // and stash the contact email so the signup upsell can pre-fill it.
  await writeOrderRefCookie(orderNumber);
  if (d.email) await writeOrderEmailCookie(orderNumber, d.email);
  redirect(`/order/${orderNumber}`);
}
