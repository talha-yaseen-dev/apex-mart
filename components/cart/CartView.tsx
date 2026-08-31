"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatPKR } from "@/lib/format";
import {
  FREE_DELIVERY_THRESHOLD_MINOR,
  FLAT_DELIVERY_FEE_MINOR,
} from "@/lib/delivery-config";

export function CartView() {
  const { items, count, subtotalMinor, setQty, remove, ready, pending } = useCart();

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 text-6xl">🛒</div>
        <h1 className="text-xl font-extrabold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add some groceries and they&apos;ll show up here.
        </p>
        <Link
          href="/c"
          className="tap-target mt-6 inline-flex items-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const deliveryFree = subtotalMinor >= FREE_DELIVERY_THRESHOLD_MINOR;
  const deliveryMinor = deliveryFree ? 0 : FLAT_DELIVERY_FEE_MINOR;
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD_MINOR - subtotalMinor);
  const progress = Math.min(100, Math.round((subtotalMinor / FREE_DELIVERY_THRESHOLD_MINOR) * 100));
  const totalMinor = subtotalMinor + deliveryMinor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-28 md:pb-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        Your cart <span className="text-muted-foreground">({count})</span>
      </h1>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Item list */}
        <ul className="flex-1 space-y-3">
          {items.map((it) => {
            const dec = () =>
              it.qty <= 1 ? remove(it.itemId) : setQty(it.itemId, it.qty - 1);
            return (
              <li
                key={it.itemId}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <Link
                  href={`/products/${it.slug}`}
                  className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-2xl">🛒</div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${it.slug}`}
                        className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary"
                      >
                        {it.name}
                      </Link>
                      {it.variantLabel && (
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {it.variantLabel}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(it.itemId)}
                      disabled={pending}
                      aria-label={`Remove ${it.name}`}
                      className="tap-target -mr-1 -mt-1 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-xl border border-primary/30 bg-primary/5">
                      <button
                        type="button"
                        onClick={dec}
                        disabled={pending}
                        aria-label="Decrease quantity"
                        className="flex size-9 items-center justify-center text-primary disabled:opacity-50"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-extrabold text-primary">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(it.itemId, it.qty + 1)}
                        disabled={pending || it.qty >= it.available}
                        aria-label="Increase quantity"
                        className="flex size-9 items-center justify-center text-primary disabled:opacity-50"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-foreground">
                        {formatPKR(it.lineTotalMinor)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatPKR(it.unitPriceMinor)} each
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-[100px] lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-extrabold text-foreground">Order summary</h2>

            {!deliveryFree && (
              <div className="mt-3">
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs font-semibold text-primary">
                  Add {formatPKR(remaining)} more for free delivery 🚚
                </p>
              </div>
            )}

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold text-foreground">{formatPKR(subtotalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-semibold text-foreground">
                  {deliveryFree ? (
                    <span className="text-primary">Free</span>
                  ) : (
                    formatPKR(deliveryMinor)
                  )}
                </dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-3">
                <dt className="text-base font-extrabold text-foreground">Total</dt>
                <dd className="text-base font-extrabold text-foreground">
                  {formatPKR(totalMinor)}
                </dd>
              </div>
            </dl>

            {/* Coupon UI intentionally omitted — see note; applies at checkout. */}

            <Link
              href="/checkout"
              className="tap-target mt-4 hidden w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 md:inline-flex"
            >
              Checkout · {formatPKR(totalMinor)}
            </Link>
            <p className="mt-3 text-center text-[11px] font-semibold text-muted-foreground">
              💵 Cash on Delivery available
            </p>
          </div>
        </aside>
      </div>

      {/* Sticky mobile checkout bar (above the bottom nav) */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Total</div>
            <div className="text-lg font-extrabold text-foreground">{formatPKR(totalMinor)}</div>
          </div>
          <Link
            href="/checkout"
            className="tap-target ml-auto inline-flex min-w-[160px] items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
          >
            Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}
