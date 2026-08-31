"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
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
  setQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * App-wide cart store. Hydrates from the guest/user cart on mount and updates
 * from the server action responses so the header badge, grid steppers, PDP and
 * cart page all stay in sync.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();

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
    setQty,
    remove,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
