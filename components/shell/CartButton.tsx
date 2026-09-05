"use client";

import Link from "next/link";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatPKR } from "@/lib/format";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

/**
 * Header cart entry point. Clicking it opens a slide-over drawer showing what's
 * in the cart, with quantity controls and a Checkout button — no full-page
 * navigation needed. The badge reflects the live cart count.
 */
export function CartButton() {
  const { items, count, subtotalMinor, pending, setQty, remove } = useCart();

  return (
    <Sheet>
      <SheetTrigger
        aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
        className="tap-target relative inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-4"
      >
        <ShoppingCart aria-hidden className="size-[18px]" />
        <span className="hidden sm:inline">Cart</span>
        {count > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-extrabold text-primary">
            {count}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>
            Your cart{count > 0 && <span className="ml-1 font-normal text-muted-foreground">({count})</span>}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingCart className="size-10 text-muted-foreground/40" aria-hidden />
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <SheetClose asChild>
              <Link href="/#shop" className="text-sm font-bold text-primary hover:underline">
                Start shopping
              </Link>
            </SheetClose>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {items.map((it) => (
                <li key={it.itemId} className="flex gap-3 py-3">
                  <SheetClose asChild>
                    <Link
                      href={`/products/${it.slug}`}
                      className="size-14 shrink-0 overflow-hidden rounded-lg border bg-muted"
                    >
                      {it.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt={it.name} className="size-full object-cover" />
                      )}
                    </Link>
                  </SheetClose>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <SheetClose asChild>
                        <Link
                          href={`/products/${it.slug}`}
                          className="line-clamp-2 text-[13px] font-semibold leading-snug hover:underline"
                        >
                          {it.name}
                        </Link>
                      </SheetClose>
                      <button
                        onClick={() => remove(it.itemId)}
                        disabled={pending}
                        aria-label={`Remove ${it.name}`}
                        className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                    {it.variantLabel && (
                      <div className="text-[11.5px] text-muted-foreground">{it.variantLabel}</div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border">
                        <button
                          onClick={() => (it.qty <= 1 ? remove(it.itemId) : setQty(it.itemId, it.qty - 1))}
                          disabled={pending}
                          aria-label="Decrease quantity"
                          className="grid size-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="w-7 text-center text-[13px] font-semibold tabular-nums">{it.qty}</span>
                        <button
                          onClick={() => setQty(it.itemId, it.qty + 1)}
                          disabled={pending || it.qty >= it.available}
                          aria-label="Increase quantity"
                          className="grid size-7 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums">{formatPKR(it.lineTotalMinor)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <SheetFooter className="gap-3 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold tabular-nums">{formatPKR(subtotalMinor)}</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground">Delivery calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <SheetClose asChild>
                  <Link
                    href="/cart"
                    className="tap-target flex h-11 items-center justify-center rounded-xl border bg-card text-sm font-bold hover:border-primary"
                  >
                    View cart
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/checkout"
                    className="tap-target flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
                  >
                    Checkout
                  </Link>
                </SheetClose>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
