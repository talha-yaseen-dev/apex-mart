import Link from "next/link";
import { getCategories } from "@/lib/storefront";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

/**
 * Categories list for the listing sidebar — sits ABOVE the price/other filters.
 *
 * mode "link"   (category/search pages): each row links to that aisle's page.
 * mode "filter" (home): each row sets `?cat=` on the current route via a soft
 *   navigation (scroll preserved), so ONLY the product grid re-renders — the
 *   page never fully reloads. Includes an "All products" row to clear it.
 */
export async function CategoryNav({
  activeSlug,
  mode = "link",
}: {
  activeSlug?: string;
  mode?: "link" | "filter";
}) {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  const order = Object.keys(CATEGORY_ICONS);
  const sorted = [...categories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  const filter = mode === "filter";
  const hrefFor = (slug: string) => (filter ? `/?cat=${slug}` : `/c/${slug}`);
  const rowCls = (active: boolean) =>
    cn(
      "tap-target flex items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold transition-colors",
      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
    );

  return (
    <fieldset className="mb-6">
      <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        Categories
      </legend>
      <div className="flex flex-col gap-1">
        {filter && (
          <Link
            href="/"
            scroll={false}
            aria-current={!activeSlug ? "page" : undefined}
            className={rowCls(!activeSlug)}
          >
            <span className="text-base leading-none">🛒</span>
            <span className="min-w-0 flex-1 truncate">All products</span>
          </Link>
        )}
        {sorted.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <Link
              key={c.slug}
              href={hrefFor(c.slug)}
              scroll={filter ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={rowCls(active)}
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
