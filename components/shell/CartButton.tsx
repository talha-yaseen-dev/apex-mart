import Link from "next/link";
import { ShoppingCart } from "lucide-react";

/**
 * Header cart entry point. The count badge is wired to the real cart when cart
 * features land (page 6); for now it renders the shell affordance.
 */
export function CartButton({ count = 0 }: { count?: number }) {
  return (
    <Link
      href="/cart"
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
    </Link>
  );
}
