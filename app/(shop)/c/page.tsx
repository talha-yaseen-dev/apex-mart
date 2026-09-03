import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/storefront";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { CategoryTile } from "@/components/shop/CategoryTile";

export const metadata: Metadata = {
  title: "Shop by category",
  description:
    "Browse every aisle at Mart Shop — groceries, beverages, snacks, household, personal care, and baby & kids. Cash on delivery, free delivery over Rs. 1,000.",
};

export default async function CategoriesIndexPage() {
  const categories = await getCategories();
  const order = Object.keys(CATEGORY_ICONS);
  const sorted = [...categories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs font-semibold text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-1.5 text-border">/</span>
        <span className="text-foreground">Categories</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Shop by category</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {sorted.length} aisles · tap one to browse
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sorted.map((c) => (
          <CategoryTile key={c.slug} slug={c.slug} name={c.name} count={c.count} size="lg" />
        ))}
      </div>
    </div>
  );
}
