"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { CartView } from "@/lib/cart";
import {
  getCart,
  addItem,
  updateQty as updateQtyAction,
  removeItem as removeItemAction,
} from "@/lib/cart-client";

type CartItem = NonNullable<CartView>["items"][number];

type CartContextValue = {
  cart: CartView | null;
  items: CartItem[];
  count: number;
  subtotalMinor: number;
  pending: boolean;
  ready: boolean;
  itemForVariant: (variantId: string | null | undefined) => CartItem | undefined;
  add: (variantId: string, qty?: number) => void;
  /** Awaitable add — resolves once the item is persisted + context updated
   *  (used by Buy now so checkout never flashes an empty cart). */
  addAsync: (variantId: string, qty?: number) => Promise<void>;
  setQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
};

/**
 * Inert fallback used when a consumer ends up outside CartProvider. The real
 * provider is always mounted in the (shop) shell, but a transient dev
 * Fast-Refresh / SSR module desync can momentarily render a card before the
 * provider is in the tree — degrade to a no-op cart instead of throwing and
 * blanking the page. Its object identity also lets useCart detect the
 * no-provider case and warn in development.
 */
const NOOP_CART: CartContextValue = {
  cart: null,
  items: [],
  count: 0,
  subtotalMinor: 0,
  pending: false,
  ready: false,
  itemForVariant: () => undefined,
  add: () => {},
  addAsync: async () => {},
  setQty: () => {},
  remove: () => {},
};

const CartContext = createContext<CartContextValue>(NOOP_CART);

/**
 * App-wide cart store. Hydrates from the guest/user cart on mount and updates
 * from the server action responses so the header badge, grid steppers, PDP and
 * cart page all stay in sync.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    getCart()
      .then((c) => {
        if (alive) setCart(c);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Landing on the order-confirmation page means checkout cleared the cart
  // server-side — re-sync so the header badge / drawer empty out (this provider
  // lives in the persistent shop layout and wouldn't otherwise re-hydrate).
  useEffect(() => {
    if (pathname?.startsWith("/order/")) {
      getCart()
        .then((c) => setCart(c))
        .catch(() => {});
    }
  }, [pathname]);

  const run = useCallback(
    (fn: () => Promise<CartView | null>, successToast?: string) => {
      startTransition(async () => {
        try {
          const next = await fn();
          setCart(next);
          if (successToast) toast.success(successToast);
        } catch {
          toast.error("Something went wrong. Please try again.");
        }
      });
    },
    [],
  );

  const add = useCallback(
    (variantId: string, qty = 1) => run(() => addItem(variantId, qty), "Added to cart"),
    [run],
  );
  // Awaitable variant for "Buy now": callers await the persist before routing to
  // checkout, so it never renders against a not-yet-updated (empty) cart. No
  // "Added to cart" toast — the user is heading straight to checkout.
  const addAsync = useCallback(async (variantId: string, qty = 1) => {
    const next = await addItem(variantId, qty);
    setCart(next);
  }, []);
  const setQty = useCallback(
    (itemId: string, qty: number) => run(() => updateQtyAction(itemId, qty)),
    [run],
  );
  const remove = useCallback(
    (itemId: string) => run(() => removeItemAction(itemId)),
    [run],
  );

  const items = cart?.items ?? [];

  const value: CartContextValue = {
    cart,
    items,
    count: cart?.itemCount ?? 0,
    subtotalMinor: cart?.subtotalMinor ?? 0,
    pending,
    ready,
    itemForVariant: (variantId) =>
      variantId ? items.find((i) => i.variantId === variantId) : undefined,
    add,
    addAsync,
    setQty,
    remove,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  // Only a real *client* render without a provider is a mistake worth flagging.
  // During SSR the client provider isn't in scope (cart state hydrates on the
  // client anyway, so the inert fallback renders identically), so we skip the
  // warning there — otherwise it would fire on every server render.
  if (
    ctx === NOOP_CART &&
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "useCart was called outside a CartProvider; falling back to an inert cart.",
    );
  }
  return ctx;
}
