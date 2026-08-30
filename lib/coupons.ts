import "server-only";
import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CouponResult =
  | { ok: true; coupon: Coupon }
  | { ok: false; error: string };

/** Validate a coupon code against existence, expiry, and redemption cap. */
export async function validateCoupon(code: string): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter a promo code." };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active)
    return { ok: false, error: "That code isn’t valid or has expired." };
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return { ok: false, error: "That code has expired." };
  if (coupon.maxRedemptions > 0 && coupon.timesRedeemed >= coupon.maxRedemptions)
    return { ok: false, error: "That code has reached its limit." };

  return { ok: true, coupon };
}
