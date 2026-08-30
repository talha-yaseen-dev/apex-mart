"use server";

import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getCartView, resolveCart } from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";
import { couponToQuote, quote } from "@/lib/pricing";
import { shippingRate } from "@/lib/shipping";
import { taxRateFor } from "@/lib/tax";
import { reserveCart, OutOfStockError } from "@/lib/reservations";
import { rateLimit } from "@/lib/rate-limit";
import {
  captureOrder,
  createOrderWithNumber,
  resolveOrderUserId,
} from "@/lib/orders";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { notifyOrderConfirmed } from "@/lib/notify";

const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  shipMethod: z.enum(["standard", "express", "overnight"]),
  couponCode: z.string().optional(),
  address: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional().default(""),
    city: z.string().min(1),
    region: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(2),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Create a PENDING order from the cart: prices it server-side (authoritative),
 * reserves stock, persists the order + items + a pending Payment, and opens a
 * Stripe PaymentIntent. Stock is NOT decremented here — that happens on capture
 * (webhook), keeping Stripe the source of truth for the PAID transition.
 */
export async function createOrderAction(input: CheckoutInput) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Please complete the required fields." };
  }
  const { address, shipMethod, couponCode } = parsed.data;

  const user = await getCurrentUser();
  const view = await getCartView();
  if (!view || view.items.length === 0) {
    return { ok: false as const, error: "Your cart is empty." };
  }

  // Sliding-window rate limit: 10 checkout attempts / minute per user.
  const rl = await rateLimit(`checkout:${user?.id ?? parsed.data.email}`, 10, 60);
  if (!rl.allowed) {
    return { ok: false as const, error: "Too many checkout attempts — please wait a moment." };
  }

  // Authoritative pricing.
  const lines = view.items.map((i) => ({
    unitPriceMinor: i.unitPriceMinor,
    qty: i.qty,
  }));
  const couponRes = couponCode ? await validateCoupon(couponCode) : null;
  const couponRow = couponRes?.ok ? couponRes.coupon : null;
  const ship = shippingRate(view.subtotalMinor, shipMethod);
  const q = quote({
    lines,
    coupon: couponRow ? couponToQuote(couponRow) : null,
    shippingMinor: ship.minor,
    taxRate: taxRateFor(address.country),
  });

  // Reserve stock (row-locked, Serializable).
  let reservationExpiresAt: Date;
  try {
    reservationExpiresAt = await reserveCart(view.id);
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return {
        ok: false as const,
        error: "Some items just sold out — please review your cart.",
      };
    }
    throw e;
  }

  const email = user?.email ?? parsed.data.email;
  const userId = await resolveOrderUserId(email, user?.id);

  // Capture the shipping address into the (real or shell) user's address book.
  await prisma.address.create({
    data: {
      userId,
      name: address.name,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    },
  });

  const order = await createOrderWithNumber((orderNumber) =>
    prisma.order.create({
      data: {
        orderNumber,
        userId,
        cartId: view.id,
        couponId: couponRow?.id ?? null,
        status: OrderStatus.PENDING,
        currency: "USD",
        subtotalMinor: q.subtotalMinor,
        discountMinor: q.discountMinor,
        shippingMinor: q.shippingMinor,
        taxMinor: q.taxMinor,
        totalMinor: q.totalMinor,
        items: {
          create: view.items.map((i) => ({
            variantId: i.variantId,
            productName: i.name,
            sku: i.sku,
            unitPriceMinor: i.unitPriceMinor,
            quantity: i.qty,
          })),
        },
      },
    }),
  );

  let clientSecret: string | null = null;
  let providerRef = `dev_${order.id}`;
  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: q.totalMinor,
      currency: "usd",
      metadata: { orderId: order.id },
      automatic_payment_methods: { enabled: true },
    });
    clientSecret = intent.client_secret;
    providerRef = intent.id;
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "stripe",
      providerRef,
      amountMinor: q.totalMinor,
      currency: "USD",
      status: PaymentStatus.PENDING,
    },
  });

  return {
    ok: true as const,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalMinor: q.totalMinor,
    reservationExpiresAt: reservationExpiresAt.toISOString(),
    clientSecret,
    dev: !stripeEnabled,
  };
}

/**
 * Dev-only capture — stands in for the Stripe webhook when no keys are set, so
 * the demo checkout can complete locally. Refuses to run when Stripe is live.
 */
export async function devConfirmOrderAction(orderId: string) {
  if (stripeEnabled) {
    return { ok: false as const, error: "Stripe is configured — capture happens via webhook." };
  }
  await captureOrder(orderId);
  await notifyOrderConfirmed(orderId);
  return { ok: true as const };
}

/**
 * Place a Cash-on-Delivery order (demo payment). Captures stock and clears the
 * cart like the card path, but records the payment provider as COD — cash is
 * collected on delivery. Not gated on Stripe: COD is an alternative to the card
 * flow, always available.
 */
export async function placeCodOrderAction(orderId: string) {
  // Ownership gate (server-side): the order must belong to the caller's own
  // cart — the signed-in user's cart, or the HMAC-signed guest cart cookie for
  // anonymous checkout. Both resolve through resolveCart(), so this covers guest
  // and account flows without breaking either. A caller who merely knows another
  // shopper's order id (or an anonymous caller with no cart) can't confirm it.
  // The "not found" response is identical whether the order is missing or owned
  // by someone else, so it never leaks another user's order existence.
  const cart = await resolveCart();
  if (!cart) return { ok: false as const, error: "Order not found." };
  const owned = await prisma.order.findFirst({
    where: { id: orderId, cartId: cart.id },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, error: "Order not found." };

  try {
    await captureOrder(orderId); // decrements stock, clears cart (idempotent on PENDING)
    await prisma.payment.updateMany({
      where: { orderId },
      data: { provider: "cod" },
    });
    await notifyOrderConfirmed(orderId);
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Couldn't place your order — an item may have just sold out.",
    };
  }
}
