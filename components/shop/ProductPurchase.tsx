"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Truck } from "lucide-react";
import type { ProductVariantView } from "@/lib/storefront";
import { formatPKR } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { WishlistButton } from "./WishlistButton";
import { cn } from "@/lib/utils";

type ProductPurchaseProps = {
  variants: ProductVariantView[];
  /** Promotional compare-at (paisa) for the cheapest variant, or null. */
  saleOriginalMinor: number | null;
  deliveryEstimate: string;
  /** Product id + current wishlist state, for the Save button. */
  productId: string;
  savedInitial: boolean;
};

function stockLabel(stock: number): { text: string; tone: "in" | "low" | "out" } {
  if (stock <= 0) return { text: "Out of stock", tone: "out" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "low" };
  return { text: "In stock", tone: "in" };
}

/**
 * Tyre-size switcher + price/stock + add-to-cart. Selecting a variant updates
 * price/unit/stock; the add control writes the selected variant to the real
 * cart and mirrors its quantity.
 */
export function ProductPurchase({
  variants,
  saleOriginalMinor,
  deliveryEstimate,
  productId,
  savedInitial,
}: ProductPurchaseProps) {
  const { itemForVariant, add, addAsync, setQty, remove, pending } = useCart();
  const router = useRouter();
  const cheapestId = variants[0]?.id;
  const [selectedId, setSelectedId] = useState(cheapestId);
  const [buying, setBuying] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const stock = selected?.stock ?? 0;
  const label = stockLabel(stock);
  const item = itemForVariant(selected?.id);
  const qty = item?.qty ?? 0;

  const onSale =
    selectedId === cheapestId &&
    !!saleOriginalMinor &&
    saleOriginalMinor > selected.priceMinor;
  const discount = onSale
    ? Math.round((1 - selected.priceMinor / saleOriginalMinor!) * 100)
    : 0;

  const dec = () => {
    if (!item) return;
    if (qty <= 1) remove(item.itemId);
    else setQty(item.itemId, qty - 1);
  };
  const inc = () => item && setQty(item.itemId, qty + 1);

  // Buy now: make sure the selected variant is in the cart, then go straight to
  // checkout (and on to payment). Awaits the add so checkout never flashes an
  // empty cart. If it's already in the cart, just proceed.
  const buyNow = async () => {
    if (stock <= 0 || pending || buying) return;
    setBuying(true);
    try {
      if (qty === 0) await addAsync(selected.id);
      router.push("/checkout");
    } catch {
      setBuying(false);
    }
  };

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

  const addControl = (variantClass?: string) => {
    if (stock <= 0) {
      return (
        <div
          className={cn(
            "flex h-11 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground",
            variantClass,
          )}
        >
          Out of stock
        </div>
      );
    }
    if (qty === 0) {
      return (
        <button
          type="button"
          onClick={() => add(selected.id)}
          disabled={pending}
          className={cn(
            "flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
            variantClass,
          )}
        >
          Add to cart
        </button>
      );
    }
    return (
      <div
        className={cn(
          "flex h-11 items-center justify-between rounded-xl bg-primary text-primary-foreground",
          variantClass,
        )}
      >
        <button
          type="button"
          onClick={dec}
          disabled={pending}
          aria-label="Decrease quantity"
          className="flex h-full items-center justify-center px-4 text-primary-foreground/85 transition-colors hover:text-primary-foreground disabled:opacity-50"
        >
          <Minus className="size-4" />
        </button>
        <span className="text-sm font-bold" aria-live="polite">
          {qty} in cart
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={pending || qty >= (item?.available ?? stock)}
          aria-label="Increase quantity"
          className="flex h-full items-center justify-center px-4 text-primary-foreground/85 transition-colors hover:text-primary-foreground disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        {priceBlock}
        {selected.attrs.unitPrice && (
          <p className="text-sm text-muted-foreground">{selected.attrs.unitPrice}</p>
        )}
      </div>

      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Tyre size
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
                  {v.attrs.size ?? v.attrs.packSize ?? v.attrs.pack ?? v.sku}
                  {soldOut && <span className="ml-1 text-[10px] font-semibold">· sold out</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <span className={cn(label.tone === "out" ? "text-muted-foreground" : "text-foreground")}>
            {label.text}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck aria-hidden className="size-4 text-primary" />
          {deliveryEstimate}
        </div>
      </div>

      <div className="hidden items-center gap-2.5 md:flex">
        {addControl("flex-1")}
        {stock > 0 && (
          <button
            type="button"
            onClick={() => void buyNow()}
            disabled={pending || buying}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
          >
            Buy now
          </button>
        )}
        <WishlistButton variant="action" productId={productId} initialSaved={savedInitial} />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <div className="min-w-0 shrink">
            <div className="text-lg font-extrabold text-primary">
              {formatPKR(selected.priceMinor)}
            </div>
            <div className="truncate text-[11px] font-medium text-muted-foreground">
              {selected.attrs.packSize ?? selected.attrs.pack}
            </div>
          </div>
          <WishlistButton variant="action" productId={productId} initialSaved={savedInitial} />
          {addControl("flex-1 min-w-0")}
          {stock > 0 && (
            <button
              type="button"
              onClick={() => void buyNow()}
              disabled={pending || buying}
              className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              Buy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
