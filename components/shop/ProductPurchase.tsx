"use client";

import { useState } from "react";
import { Minus, Plus, Truck } from "lucide-react";
import type { ProductVariantView } from "@/lib/storefront";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductPurchaseProps = {
  variants: ProductVariantView[];
  /** Promotional compare-at (paisa) for the cheapest variant, or null. */
  saleOriginalMinor: number | null;
  deliveryEstimate: string;
};

function stockLabel(stock: number): { text: string; tone: "in" | "low" | "out" } {
  if (stock <= 0) return { text: "Out of stock", tone: "out" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "low" };
  return { text: "In stock", tone: "in" };
}

/**
 * Pack-size switcher + price/stock + add-to-cart. Selecting a variant updates
 * the price, unit price and stock. Quantity is local UI state — real cart
 * persistence lands with the cart (page 6).
 */
export function ProductPurchase({
  variants,
  saleOriginalMinor,
  deliveryEstimate,
}: ProductPurchaseProps) {
  const cheapestId = variants[0]?.id;
  const [selectedId, setSelectedId] = useState(cheapestId);
  const [qty, setQty] = useState(0);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const stock = selected?.stock ?? 0;
  const label = stockLabel(stock);
  const onSale =
    selectedId === cheapestId &&
    !!saleOriginalMinor &&
    saleOriginalMinor > selected.priceMinor;
  const discount = onSale
    ? Math.round((1 - selected.priceMinor / saleOriginalMinor!) * 100)
    : 0;

  const priceBlock = (
    <div className="flex items-baseline gap-2.5">
      <span className="text-3xl font-extrabold text-primary">
        {formatPKR(selected.priceMinor)}
      </span>
      {onSale && (
        <>
          <span className="text-base font-semibold text-muted-foreground line-through">
            {formatPKR(saleOriginalMinor!)}
          </span>
          <span className="rounded-md bg-deal px-1.5 py-0.5 text-xs font-extrabold text-deal-foreground">
            {discount}% OFF
          </span>
        </>
      )}
    </div>
  );

  const addControl = (variantClass?: string) =>
    stock <= 0 ? (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted py-3 text-sm font-bold text-muted-foreground",
          variantClass,
        )}
      >
        Out of stock
      </div>
    ) : qty === 0 ? (
      <button
        type="button"
        onClick={() => setQty(1)}
        className={cn(
          "tap-target rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90",
          variantClass,
        )}
      >
        Add to cart
      </button>
    ) : (
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5",
          variantClass,
        )}
      >
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(0, q - 1))}
          aria-label="Decrease quantity"
          className="tap-target flex items-center justify-center px-4 text-primary"
        >
          <Minus className="size-4" />
        </button>
        <span className="text-sm font-extrabold text-primary" aria-live="polite">
          {qty} in cart
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          aria-label="Increase quantity"
          className="tap-target flex items-center justify-center px-4 text-primary"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      {/* Price block */}
      <div className="flex flex-col gap-1">
        {priceBlock}
        {selected.attrs.unitPrice && (
          <p className="text-sm text-muted-foreground">{selected.attrs.unitPrice}</p>
        )}
      </div>

      {/* Pack-size switcher */}
      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Pack size
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = v.id === selectedId;
              const soldOut = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  aria-pressed={active}
                  className={cn(
                    "tap-target rounded-xl border px-4 text-sm font-bold transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-foreground hover:border-primary/40",
                    soldOut && "opacity-50",
                  )}
                >
                  {v.attrs.pack ?? v.sku}
                  {soldOut && <span className="ml-1 text-[10px] font-semibold">· sold out</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock + delivery */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              label.tone === "in" && "bg-primary",
              label.tone === "low" && "bg-deal",
              label.tone === "out" && "bg-muted-foreground",
            )}
          />
          <span
            className={cn(
              label.tone === "out" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {label.text}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck aria-hidden className="size-4 text-primary" />
          {deliveryEstimate}
        </div>
      </div>

      {/* Inline add (desktop) */}
      <div className="hidden md:block">{addControl("w-full")}</div>

      {/* Sticky add bar (mobile) — sits above the bottom nav, respects safe area */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-primary">
              {formatPKR(selected.priceMinor)}
            </div>
            <div className="truncate text-[11px] font-medium text-muted-foreground">
              {selected.attrs.pack}
            </div>
          </div>
          {addControl("ml-auto min-w-[160px]")}
        </div>
      </div>
    </div>
  );
}
