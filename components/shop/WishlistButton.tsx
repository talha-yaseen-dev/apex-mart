"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  productId: string;
  initialSaved: boolean;
  /** "icon" = compact heart for grid cards; "labeled" = heart + Save/Saved text. */
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * Save-to-wishlist heart. Optimistically toggles, then reconciles with the
 * server action; reverts + toasts on error. Signed-out visitors are sent to
 * sign-in with a callback back to the current page — no guest wishlist.
 */
export function WishlistButton({
  productId,
  initialSaved,
  variant = "icon",
  className,
}: WishlistButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = (e: React.MouseEvent) => {
    // The heart often sits over a product link — never navigate on a save.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !saved;
    setSaved(next); // optimistic

    startTransition(async () => {
      try {
        const res = await toggleWishlistAction(productId);
        if (!res.ok) {
          setSaved(!next); // revert
          if (res.needsAuth) {
            const cb = window.location.pathname + window.location.search;
            router.push(`/signin?callbackUrl=${encodeURIComponent(cb)}`);
            return;
          }
          toast.error("Couldn't update your wishlist. Try again.");
          return;
        }
        setSaved(res.saved); // authoritative
        toast.success(res.saved ? "Added to wishlist" : "Removed from wishlist");
      } catch {
        setSaved(!next); // revert
        toast.error("Couldn't update your wishlist. Try again.");
      }
    });
  };

  const label = saved ? "Remove from wishlist" : "Save to wishlist";
  const heart = (
    <Heart
      className={cn(
        "size-4 transition-colors",
        saved ? "fill-primary text-primary" : "fill-none",
      )}
      aria-hidden
    />
  );

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          "tap-target inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors disabled:opacity-60",
          saved
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-input bg-background text-foreground hover:border-primary/40 hover:text-primary",
          className,
        )}
      >
        {heart}
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-primary disabled:opacity-60",
        saved && "text-primary",
        className,
      )}
    >
      {heart}
    </button>
  );
}
