import Link from "next/link";
import { getCategories } from "@/lib/storefront";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

/**
 * Categories list for the listing sidebar — sits ABOVE the price/other filters
 * on the category, search and home pages. Each row links to that aisle's page;
 * the current aisle (if any) is highlighted.
 */
export async function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  const order = Object.keys(CATEGORY_ICONS);
  const sorted = [...categories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  return (
    <fieldset className="mb-6">
      <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        Categories
      </legend>
      <div className="flex flex-col gap-1">
        {sorted.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <Link
              key={c.slug}
              href={`/c/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap-target flex items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold transition-colors",
                active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
              )}
            >
              <span className="text-base leading-none">{CATEGORY_ICONS[c.slug] ?? "🛒"}</span>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-xs font-medium text-muted-foreground">{c.count}</span>
            </Link>
          );
        })}
      </div>
    </fieldset>
  );
}
