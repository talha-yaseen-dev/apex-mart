"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import type { StoreCard } from "@/lib/catalog-filter";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  card: StoreCard;
  /** Promotional compare-at price (paisa) — renders strike-through + discount. */
  originalMinor?: number | null;
  isNew?: boolean;
};

/**
 * Storefront product card: image, pack size, name, price (+ optional sale
 * original / unit price) and an add control that expands into a quantity
 * stepper. Reused on home, category, and search grids.
 *
 * NOTE: the quantity is local UI state for now — real cart persistence and the
 * header badge are wired when the cart lands (page 6).
 */
export function ProductCard({ card, originalMinor, isNew }: ProductCardProps) {
  const [qty, setQty] = useState(0);

  const href = `/products/${card.slug}`;
  const onSale = !!originalMinor && originalMinor > card.minPriceMinor;
  const discount = onSale
    ? Math.round((1 - card.minPriceMinor / originalMinor!) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)]">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-muted"
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
          <div className="flex size-full items-center justify-center text-3xl">🛒</div>
        )}

        {/* Top-left tags */}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {isNew && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground">
              New
            </span>
          )}
        </div>

        {/* Discount badge */}
        {onSale && discount > 0 && (
          <div className="absolute right-2 top-2 flex size-10 flex-col items-center justify-center rounded-full bg-deal text-deal-foreground shadow-sm">
            <span className="text-[11px] font-extrabold leading-none">{discount}%</span>
            <span className="text-[8px] font-bold leading-none opacity-80">OFF</span>
          </div>
        )}

        {/* Out of stock */}
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
        {!card.inStock ? (
          <div className="rounded-xl bg-muted py-2.5 text-center text-xs font-bold text-muted-foreground">
            Unavailable
          </div>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => setQty(1)}
            className="tap-target w-full rounded-xl bg-primary text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + Add to cart
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(0, q - 1))}
              aria-label="Decrease quantity"
              className="tap-target flex items-center justify-center px-3 text-primary"
            >
              <Minus className="size-4" />
            </button>
            <span className="text-sm font-extrabold text-primary" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              className="tap-target flex items-center justify-center px-3 text-primary"
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
