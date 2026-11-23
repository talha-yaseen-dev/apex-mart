"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { StoreCard } from "@/lib/catalog-filter";
import { formatPKR } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { WishlistButton } from "./WishlistButton";

type ProductCardProps = {
  card: StoreCard;
  /** Promotional compare-at price (paisa) — renders strike-through + discount. */
  originalMinor?: number | null;
  isNew?: boolean;
  /** Suppress the built-in save heart (e.g. the account wishlist grid, which
   *  has its own remove control in the same corner). */
  hideWishlist?: boolean;
};

/**
 * Storefront product card. The add control writes the cheapest variant to the
 * real cart and mirrors its quantity; reused on home, category, and search.
 * Busy state is LOCAL to each card so acting on one card never dims the others.
 */
export function ProductCard({ card, originalMinor, isNew, hideWishlist }: ProductCardProps) {
  const { itemForVariant, addAsync, setQty, remove } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const item = itemForVariant(card.variantId);
  const qty = item?.qty ?? 0;

  const href = `/products/${card.slug}`;
  const onSale = !!originalMinor && originalMinor > card.minPriceMinor;
  const discount = onSale
    ? Math.round((1 - card.minPriceMinor / originalMinor!) * 100)
    : 0;

  const dec = () => {
    if (!item) return;
    if (qty <= 1) remove(item.itemId);
    else setQty(item.itemId, qty - 1);
  };
  const inc = () => item && setQty(item.itemId, qty + 1);

  const onAdd = async () => {
    if (busy || !card.variantId) return;
    setBusy(true);
    try {
      await addAsync(card.variantId);
      toast.success("Added to cart");
    } catch {
      toast.error("Couldn’t add to cart. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Buy now: ensure the item is in the cart, then straight to checkout. Awaits
  // the add so checkout never lands on a not-yet-updated (empty) cart.
  const buyNow = async () => {
    if (!card.inStock || !card.variantId || busy) return;
    setBusy(true);
    try {
      if (qty === 0) await addAsync(card.variantId);
      router.push("/checkout");
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)]">
      {/* Sibling of the image link so a save never triggers navigation. */}
      {!hideWishlist && (
        <WishlistButton
          productId={card.id}
          initialSaved={!!card.isSaved}
          className="absolute right-2 top-2 z-10"
        />
      )}
      <Link
        href={href}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
        aria-label={card.name}
      >
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image}
            alt={card.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl">🛞</div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {isNew && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground">
              New
            </span>
          )}
        </div>

        {onSale && discount > 0 && (
          <div className="absolute right-2 top-12 flex size-10 flex-col items-center justify-center rounded-full bg-deal text-deal-foreground shadow-sm">
            <span className="text-[11px] font-extrabold leading-none">{discount}%</span>
            <span className="text-[8px] font-bold leading-none opacity-80">OFF</span>
          </div>
        )}

        {!card.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Out of stock
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-3 pt-2.5">
        {card.pack && (
          <p className="text-[11px] font-semibold text-muted-foreground">{card.pack}</p>
        )}
        <Link
          href={href}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground hover:text-primary"
        >
          {card.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-[15px] font-extrabold text-primary">
            {formatPKR(card.minPriceMinor)}
          </span>
          {onSale && (
            <span className="text-[11px] font-semibold text-muted-foreground line-through">
              {formatPKR(originalMinor!)}
            </span>
          )}
        </div>
        {card.unitPrice && (
          <p className="text-[11px] text-muted-foreground">{card.unitPrice}</p>
        )}
      </div>

      <div className="p-3 pt-2">
        {!card.inStock || !card.variantId ? (
          <div className="rounded-xl bg-muted py-2.5 text-center text-xs font-bold text-muted-foreground">
            Unavailable
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {qty === 0 ? (
              <button
                type="button"
                onClick={() => void onAdd()}
                disabled={busy}
                className="tap-target flex-1 rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                + Add
              </button>
            ) : (
              <div className="flex h-11 flex-1 items-center justify-between rounded-xl bg-primary text-primary-foreground">
                <button
                  type="button"
                  onClick={dec}
                  disabled={busy}
                  aria-label="Decrease quantity"
                  className="flex h-full items-center justify-center px-3 text-primary-foreground/85 transition-colors hover:text-primary-foreground disabled:opacity-50"
                >
                  <Minus className="size-4" />
                </button>
                <span className="text-sm font-bold" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={inc}
                  disabled={busy || (item ? qty >= item.available : false)}
                  aria-label="Increase quantity"
                  className="flex h-full items-center justify-center px-3 text-primary-foreground/85 transition-colors hover:text-primary-foreground disabled:opacity-50"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => void buyNow()}
              disabled={busy}
              className="tap-target shrink-0 rounded-xl bg-foreground px-3.5 text-xs font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              Buy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
