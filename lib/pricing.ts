/**
 * Pricing engine — the correctness-critical money path.
 *
 * Every amount is an integer count of minor units (cents); there is never a
 * float multiply on the total. Order of operations (from the checkout spec):
 *   subtotal → discount → shipping (free-shipping coupon zeroes it) → tax
 * Tax is applied AFTER discount and shipping, rounded exactly once. Neither the
 * discount nor the total is ever allowed below zero.
 *
 * Pure and dependency-free so it runs identically on client and server and is
 * unit-tested directly (see tests/unit/pricing.test.ts).
 */

export type QuoteLine = { unitPriceMinor: number; qty: number };

export type QuoteCoupon = {
  type: "percent" | "fixed" | "free_shipping";
  value: number;
};

export type QuoteInput = {
  lines: QuoteLine[];
  coupon?: QuoteCoupon | null;
  shippingMinor?: number;
  taxRate?: number;
};

export type Quote = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

const int = (n: number) => Math.max(0, Math.round(n));

export function quote(input: QuoteInput): Quote {
  const subtotalMinor = input.lines.reduce(
    (sum, l) => sum + int(l.unitPriceMinor) * int(l.qty),
    0,
  );

  const coupon = input.coupon ?? null;

  let discountMinor = 0;
  if (coupon?.type === "percent") {
    discountMinor = Math.round((subtotalMinor * coupon.value) / 100);
  } else if (coupon?.type === "fixed") {
    discountMinor = int(coupon.value);
  }
  // A discount can never exceed the subtotal (so the total can't go negative).
  discountMinor = Math.min(Math.max(0, discountMinor), subtotalMinor);

  const shippingMinor =
    coupon?.type === "free_shipping" ? 0 : int(input.shippingMinor ?? 0);

  const taxable = subtotalMinor - discountMinor + shippingMinor;
  const taxMinor = Math.max(0, Math.round(taxable * (input.taxRate ?? 0)));

  const totalMinor = Math.max(
    0,
    subtotalMinor - discountMinor + shippingMinor + taxMinor,
  );

  return { subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor };
}

/** Convert a persisted Coupon (Prisma enum shape) into a quote coupon. */
export function couponToQuote(c: {
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
}): QuoteCoupon {
  const map = {
    PERCENT: "percent",
    FIXED: "fixed",
    FREE_SHIPPING: "free_shipping",
  } as const;
  return { type: map[c.type], value: c.value };
}
