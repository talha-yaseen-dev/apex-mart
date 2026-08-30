"use server";

import { revalidatePath } from "next/cache";
import {
  addToCart,
  getCartView,
  removeItem,
  setItemQty,
} from "@/lib/cart";
import { validateCoupon } from "@/lib/coupons";

export async function addToCartAction(variantId: string, qty = 1) {
  await addToCart(variantId, qty);
  revalidatePath("/cart");
  revalidatePath("/checkout");
  const view = await getCartView();
  return { ok: true as const, count: view?.itemCount ?? 0 };
}

export async function setQtyAction(itemId: string, qty: number) {
  await setItemQty(itemId, qty);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removeItemAction(itemId: string) {
  await removeItem(itemId);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

/** Validate a promo code for the checkout summary (does not persist anything). */
export async function applyCouponAction(code: string) {
  const res = await validateCoupon(code);
  if (!res.ok) return { ok: false as const, error: res.error };
  return {
    ok: true as const,
    code: res.coupon.code,
    type: res.coupon.type,
    value: res.coupon.value,
  };
}
