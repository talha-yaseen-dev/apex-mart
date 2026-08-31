"use server";

/**
 * Cart operations for the storefront, exposed as server actions so client
 * components can call them directly. They wrap Nova's cart layer (lib/cart),
 * which resolves the cart from the signed guest cookie (nova_cart) or the
 * signed-in user — no auth patching, works for guests. Each returns the fresh
 * CartView so the client store can update in one round-trip.
 *
 * (The REST /api/v1/cart routes are auth-only — no guest path — so the guest
 * storefront uses this action layer instead.)
 */
import {
  getCartView,
  addToCart,
  setItemQty,
  removeItem as removeCartItem,
} from "@/lib/cart";
import type { CartView } from "@/lib/cart";

export async function getCart(): Promise<CartView | null> {
  return getCartView();
}

export async function addItem(variantId: string, qty = 1): Promise<CartView | null> {
  await addToCart(variantId, qty);
  return getCartView();
}

export async function updateQty(itemId: string, qty: number): Promise<CartView | null> {
  await setItemQty(itemId, qty);
  return getCartView();
}

export async function removeItem(itemId: string): Promise<CartView | null> {
  await removeCartItem(itemId);
  return getCartView();
}
