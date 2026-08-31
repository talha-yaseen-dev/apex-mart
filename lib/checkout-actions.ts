"use server";

import { redirect } from "next/navigation";
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type PlaceOrderError,
} from "@/lib/checkout-schema";
import { resolveGuestUser, GuestCheckoutError } from "@/lib/guest-user";
import { getCartViewFor } from "@/lib/api/cart";
import { createOrderFor, confirmOrderFor } from "@/lib/api/checkout";
import { clearCartCookie } from "@/lib/cart-cookie";
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

  // Resolve guest identity + attach cart.
  let userId: string;
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
  const line2 = [d.area, d.riderNote && `Rider: ${d.riderNote}`, `Slot: ${d.slot}`]
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

  await clearCartCookie();
  redirect(`/order/${orderNumber}`);
}
