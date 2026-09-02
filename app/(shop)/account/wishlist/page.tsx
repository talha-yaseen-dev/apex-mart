import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getWishlistCards } from "@/lib/account";
import { WishlistGrid } from "@/components/account/WishlistGrid";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const items = await getWishlistCards(user.id);

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Wishlist</h1>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      <WishlistGrid items={items} />
    </div>
  );
}
