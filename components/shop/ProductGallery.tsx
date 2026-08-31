"use client";

import { useState } from "react";
import type { ProductImageView } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/**
 * Product image gallery: large main image + a thumbnail strip when there is
 * more than one image (tap on mobile, click on desktop). Falls back gracefully
 * to a single image or a placeholder.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: ProductImageView[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden bg-muted sm:rounded-2xl">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main.url}
            alt={main.alt || name}
            className="size-full object-cover"
            // First image is the LCP element; let the browser prioritise it.
            fetchPriority="high"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-6xl">🛒</div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                i === active ? "border-primary" : "border-border hover:border-primary/40",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
