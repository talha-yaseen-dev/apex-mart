"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { X, Heart } from "lucide-react";
import { toast } from "sonner";
import type { StoreCard } from "@/lib/catalog-filter";
import { removeWishlistAction } from "@/lib/actions/wishlist";
import { ProductCard } from "@/components/shop/ProductCard";

type WishlistItem = { id: string; card: StoreCard };

export function WishlistGrid({ items }: { items: WishlistItem[] }) {
  const [optimistic, removeOptimistic] = useOptimistic(
    items,
    (state: WishlistItem[], id: string) => state.filter((i) => i.id !== id),
  );
  const [isPending, startTransition] = useTransition();

  const remove = (id: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const res = await removeWishlistAction(id);
      if (!res.ok) toast.error("Couldn't remove the item. Please try again.");
    });
  };

  if (optimistic.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <Heart className="mx-auto size-9 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-extrabold text-foreground">No saved items</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the heart on any product to save it for later.
        </p>
        <Link
          href="/"
          className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {optimistic.map((it) => (
        <div key={it.id} className="relative">
          <button
            type="button"
            onClick={() => remove(it.id)}
            disabled={isPending}
            aria-label={`Remove ${it.card.name} from wishlist`}
            className="tap-target absolute right-2 top-2 z-10 flex items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-destructive disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
          <ProductCard card={it.card} hideWishlist />
        </div>
      ))}
    </div>
  );
}
