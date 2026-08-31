import "server-only";
import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateCoupon } from "@/lib/coupons";
import { couponToQuote, quote } from "@/lib/pricing";
import { shippingRate, shippingRates } from "@/lib/shipping";
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
import { getCartViewFor } from "@/lib/api/cart";
import { ApiError } from "@/lib/api/http";

export const checkoutSchema = z.object({
  shipMethod: z.enum(["standard", "express", "overnight"]),
  couponCode: z.string().trim().optional(),
  address: z.object({
    name: z.string().trim().min(1),
    line1: z.string().trim().min(1),
    line2: z.string().trim().optional().default(""),
    city: z.string().trim().min(1),
    region: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().min(2),
  }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Price the current cart for a chosen shipping method / coupon / destination.
 * Returns the shipping options (so the client can render prices) alongside the
 * authoritative quote and any coupon error. Pure read — no reservations.
 */
export async function quoteFor(
  userId: string,
  opts: { shipMethod?: string; couponCode?: string; country?: string },
) {
  const view = await getCartViewFor(userId);
  const lines = view.items.map((i) => ({ unitPriceMinor: i.unitPriceMinor, qty: i.qty }));

  const couponRes = opts.couponCode ? await validateCoupon(opts.couponCode) : null;
  const couponRow = couponRes?.ok ? couponRes.coupon : null;
  const couponError = couponRes && !couponRes.ok ? couponRes.error : null;

  const ship = shippingRate(view.subtotalMinor, opts.shipMethod ?? "standard");
  const q = quote({
    lines,
    coupon: couponRow ? couponToQuote(couponRow) : null,
    shippingMinor: ship.minor,
    taxRate: taxRateFor(opts.country ?? "US"),
  });

  return {
    cart: view,
    shippingOptions: shippingRates(view.subtotalMinor),
    selectedShipping: ship,
    couponApplied: couponRow ? { code: couponRow.code } : null,
    couponError,
    quote: q,
  };
}

/**
 * Create a PENDING order from the user's cart — mirrors createOrderAction:
 * authoritative server-side pricing, stock reservation, order + items + pending
 * payment. Stock is decremented later, at capture. Returns the order handle.
 */
export async function createOrderFor(
  userId: string,
  email: string,
  input: CheckoutInput,
  // Mart Shop override (opt-in, backward compatible): the storefront prices
  // delivery from lib/delivery-config (Rs.120 flat / free over Rs.1,500) and
  // does not itemise GST to end customers, so it passes an explicit delivery
  // fee and skips tax. Absent these, Nova's default shipping/tax apply.
  opts?: { deliveryFeeOverride?: number; skipTax?: boolean; currency?: string },
) {
  const orderCurrency = opts?.currency ?? "USD";
  const { address, shipMethod, couponCode } = input;

  const view = await getCartViewFor(userId);
  if (view.items.length === 0) throw new ApiError(400, "Your cart is empty.");

  const rl = await rateLimit(`checkout:${userId}`, 10, 60);
  if (!rl.allowed) {
    throw new ApiError(429, "Too many checkout attempts — please wait a moment.");
  }

  const lines = view.items.map((i) => ({ unitPriceMinor: i.unitPriceMinor, qty: i.qty }));
  const couponRes = couponCode ? await validateCoupon(couponCode) : null;
  const couponRow = couponRes?.ok ? couponRes.coupon : null;
  const ship = shippingRate(view.subtotalMinor, shipMethod);
  const q = quote({
    lines,
    coupon: couponRow ? couponToQuote(couponRow) : null,
    shippingMinor: opts?.deliveryFeeOverride ?? ship.minor,
    taxRate: opts?.skipTax ? 0 : taxRateFor(address.country),
  });

  let reservationExpiresAt: Date;
  try {
    reservationExpiresAt = await reserveCart(view.id);
  } catch (e) {
    if (e instanceof OutOfStockError) {
      throw new ApiError(409, "Some items just sold out — please review your cart.");
    }
    throw e;
  }

  const orderUserId = await resolveOrderUserId(email, userId);

  await prisma.address.create({
    data: {
      userId: orderUserId,
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
        userId: orderUserId,
        cartId: view.id,
        couponId: couponRow?.id ?? null,
        status: OrderStatus.PENDING,
        currency: orderCurrency,
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
      currency: orderCurrency,
      status: PaymentStatus.PENDING,
    },
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalMinor: q.totalMinor,
    reservationExpiresAt: reservationExpiresAt.toISOString(),
    clientSecret,
    dev: !stripeEnabled,
  };
}

/**
 * Complete a demo payment for the user's own PENDING order — the capture path
 * used when Stripe isn't configured (the live portfolio deploy). `method` sets
 * the recorded payment provider ("cod" or "card"). When Stripe IS live, card
 * capture happens via the webhook, so only COD is accepted here.
 */
export async function confirmOrderFor(
  userId: string,
  orderId: string,
  method: "cod" | "card",
  // Optional real contact email for the receipt (guest checkout). The stored
  // user email may be synthetic; this routes the confirmation to the shopper.
  contactEmail?: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, status: true },
  });
  if (!order) throw new ApiError(404, "Order not found.");

  if (stripeEnabled && method === "card") {
    throw new ApiError(400, "Card payments complete via the web checkout — choose Cash on Delivery.");
  }

  try {
    await captureOrder(order.id);
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { provider: method === "cod" ? "cod" : "stripe" },
    });
    await notifyOrderConfirmed(order.id, contactEmail);
  } catch {
    throw new ApiError(409, "Couldn't place your order — an item may have just sold out.");
  }
  return { orderId: order.id };
}
