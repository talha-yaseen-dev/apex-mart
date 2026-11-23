"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import type { ProductVariantView, ProductImageView } from "@/lib/storefront";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/CartProvider";
import { WishlistButton } from "./WishlistButton";
import { STORE } from "@/lib/delivery-config";

type ProductDetailProps = {
  name: string;
  brand: string | null;
  categoryName: string;
  categorySlug: string;
  images: ProductImageView[];
  variants: ProductVariantView[];
  productId: string;
  savedInitial: boolean;
  deliveryEstimate: string;
};

/**
 * Redesigned product detail — a white image card (sticky on desktop) beside the
 * info column: brand/title, price, tyre-size buttons (with prices),
 * add/stepper + buy-now, a trust row, and the product-details list. Pack state
 * is shared across both columns (the badge + price + stock all follow it).
 * Reuses the real cart/wishlist wiring; busy state is local so it never dims
 * anything else on the page.
 */
export function ProductDetail({
  name,
  brand,
  categoryName,
  categorySlug,
  images,
  variants,
  productId,
  savedInitial,
  deliveryEstimate,
}: ProductDetailProps) {
  const { itemForVariant, addAsync, setQty, remove } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(variants[0]?.id);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const stock = selected?.stock ?? 0;
  const quoteOnly = selected?.priceMinor <= 0;
  const enquiryUrl = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hello, please confirm the price and availability of ${name} (${selected?.attrs.size ?? "tyre"}).`)}`;
  const item = itemForVariant(selected?.id);
  const qty = item?.qty ?? 0;
  const image = images[0];

  const packOf = (v: ProductVariantView) => v.attrs.size ?? v.attrs.packSize ?? v.attrs.pack ?? v.sku;
  const packsLabel = variants.map(packOf).filter(Boolean).join(", ");
  const specs = [
    ["pattern", "Pattern"],
    ["construction", "Construction"],
    ["position", "Position"],
    ["season", "Season"],
    ["tubeless", "Tubeless"],
    ["loadIndex", "Load index"],
    ["speedRating", "Speed rating"],
    ["plyRating", "Ply rating"],
  ] as const;

  const onAdd = async () => {
    if (busy || stock <= 0) return;
    setBusy(true);
    try {
      await addAsync(selected.id);
    } finally {
      setBusy(false);
    }
  };
  const inc = () => item && setQty(item.itemId, qty + 1);
  const dec = () => {
    if (!item) return;
    if (qty <= 1) remove(item.itemId);
    else setQty(item.itemId, qty - 1);
  };
  const buyNow = async () => {
    if (stock <= 0 || busy) return;
    setBusy(true);
    try {
      if (qty === 0) await addAsync(selected.id);
      router.push("/checkout");
    } catch {
      setBusy(false);
    }
  };

  const stockLabel = stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,620px)] lg:items-start lg:justify-center">
      {/* Image card */}
      <div className="w-full rounded-[20px] border border-border bg-card p-4 lg:sticky lg:top-[116px]">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt || name}
              className="size-full object-contain p-5"
              fetchPriority="high"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-6xl">🛒</div>
          )}
          <span className="absolute left-3.5 top-3.5 rounded-[9px] border border-border bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground">
            {packOf(selected)}
          </span>
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 px-1">
          <span className="text-xs text-muted-foreground">
            {variants.length > 1
              ? "Select your tyre size to view its details"
              : quoteOnly ? "Confirm fitment, price and availability before ordering" : "Tyre delivery in Sargodha City"}
          </span>
          <WishlistButton
            variant="labeled"
            productId={productId}
            initialSaved={savedInitial}
            className="ml-auto h-9 rounded-[11px] border-border px-3 text-[13px] font-medium"
          />
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">Manufacturer image for reference. Tyre only; wheel shown for display.</p>
      </div>

      {/* Info column */}
      <div className="flex flex-col gap-5">
        <div>
          {brand && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
              {brand}
            </p>
          )}
          <h1 className="mt-1.5 text-3xl font-semibold leading-[1.15] tracking-tight text-foreground">
            {name}
          </h1>
          <Link
            href={`/c/${categorySlug}`}
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            {categoryName}
          </Link>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {quoteOnly ? "Ask for price" : formatPKR(selected.priceMinor)}
            </span>
            {selected.attrs.unitPrice && (
              <span className="font-mono text-[13px] text-muted-foreground">
                {selected.attrs.unitPrice}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {quoteOnly ? "Price and availability are confirmed by the shop before purchase." : "Price in PKR · Cash on delivery available"}
          </p>
        </div>

        {variants.length > 1 && (
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Tyre size
            </p>
            <div className="flex flex-wrap gap-2.5">
              {variants.map((v) => {
                const active = v.id === selectedId;
                const soldOut = v.priceMinor > 0 && v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    aria-pressed={active}
                    className={cn(
                      "min-w-[118px] rounded-[13px] border-[1.5px] px-3.5 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary-tint"
                        : "border-input bg-card hover:border-primary/40",
                      soldOut && "opacity-50",
                    )}
                  >
                    <div className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                      {packOf(v)}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 font-mono text-xs",
                        active ? "text-primary/80" : "text-muted-foreground",
                      )}
                    >
                      {v.priceMinor <= 0 ? "Ask for price" : formatPKR(v.priceMinor)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {quoteOnly ? (
            <a
              href={enquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[52px] min-w-[180px] flex-1 items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Ask for price on WhatsApp
            </a>
          ) : stock <= 0 ? (
            <div className="flex h-[52px] min-w-[180px] flex-1 items-center justify-center rounded-2xl bg-muted text-sm font-semibold text-muted-foreground">
              Out of stock
            </div>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => void onAdd()}
              disabled={busy}
              className="h-[52px] min-w-[180px] flex-1 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_8px_18px_-12px_rgba(11,117,128,0.9)] transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Add to cart
            </button>
          ) : (
            <div className="flex h-[52px] min-w-[180px] flex-1 items-center justify-between rounded-2xl border-[1.5px] border-primary text-primary">
              <button
                type="button"
                onClick={dec}
                aria-label="Decrease quantity"
                className="flex h-full w-12 items-center justify-center rounded-l-2xl text-xl transition-colors hover:bg-primary-tint"
              >
                −
              </button>
              <span className="text-sm font-semibold" aria-live="polite">
                {qty} in cart
              </span>
              <button
                type="button"
                onClick={inc}
                disabled={qty >= (item?.available ?? stock)}
                aria-label="Increase quantity"
                className="flex h-full w-12 items-center justify-center rounded-r-2xl text-xl transition-colors hover:bg-primary-tint disabled:opacity-40"
              >
                +
              </button>
            </div>
          )}
          {!quoteOnly && stock > 0 && (
            <button
              type="button"
              onClick={() => void buyNow()}
              disabled={busy}
              className="h-[52px] min-w-[180px] flex-1 rounded-2xl bg-foreground text-[15px] font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
            >
              Buy now
            </button>
          )}
        </div>

        {/* Trust row */}
        {quoteOnly ? (
          <div className="rounded-2xl border border-primary/20 bg-primary-tint p-4 text-sm text-foreground">
            Checkout is unavailable until this tyre’s price and stock are confirmed. Ask us for a quote and fitment advice.
          </div>
        ) : <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          <div className="bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className={cn("size-[7px] rounded-full", stock > 0 ? "bg-primary" : "bg-muted-foreground")} />
              {stockLabel}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Ships from the Sargodha City store</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Truck className="size-4 text-primary" aria-hidden />
              {deliveryEstimate}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Choose a delivery slot at checkout</p>
          </div>
        </div>}

        {/* Product details */}
        <div className="rounded-2xl border border-border bg-card p-[18px]">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Product details</h2>
          {selected.attrs.description && (
            <p className="mb-4 text-sm leading-6 text-muted-foreground">{selected.attrs.description}</p>
          )}
          <dl className="grid grid-cols-[minmax(96px,auto)_1fr] gap-x-[18px] gap-y-[9px] text-[13.5px]">
            {brand && (
              <>
                <dt className="text-muted-foreground">Brand</dt>
                <dd className="m-0 text-foreground">{brand}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Category</dt>
            <dd className="m-0 text-foreground">{categoryName}</dd>
            {selected.attrs.usage && (
              <>
                <dt className="text-muted-foreground">Best for</dt>
                <dd className="m-0 text-foreground">{selected.attrs.usage}</dd>
              </>
            )}
            {packsLabel && (
              <>
                <dt className="text-muted-foreground">Tyre sizes</dt>
                <dd className="m-0 text-foreground">{packsLabel}</dd>
              </>
            )}
            {specs.map(([key, label]) => selected.attrs[key] ? (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="m-0 text-foreground">{selected.attrs[key]}</dd>
              </div>
            ) : null)}
            {!quoteOnly && <><dt className="text-muted-foreground">Payment</dt><dd className="m-0 text-foreground">Cash on delivery</dd></>}
          </dl>
          {selected.attrs.sourceUrl && (
            <a href={selected.attrs.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              View manufacturer specifications ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
