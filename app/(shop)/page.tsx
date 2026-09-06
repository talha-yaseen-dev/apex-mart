import { getSearchResults, getCategoryProducts, getCategories } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { withWishlistState } from "@/lib/account";
import { CategoryRail } from "@/components/shop/CategoryRail";
import { ResultsBrowser } from "@/components/shop/ResultsBrowser";
import { TRUST_POINTS, CATEGORY_ICONS } from "@/lib/home-content";
import { STORE } from "@/lib/delivery-config";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Home = the full storefront listing. A compact brand banner, then the faceted
 * catalog (categories + price/availability filters in the left sidebar, product
 * grid, sort, pagination) over every product — the same chrome as the category
 * and search pages. Filters/sort/pagination drive `/?…` query params.
 */
export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  // A category click sets ?cat= — filter to that aisle in place (only the grid
  // re-renders). No cat = the whole catalogue.
  const raw = sp.cat;
  const cat = Array.isArray(raw) ? raw[0] : raw;
  const [{ items: rawItems, total, page, totalPages, facets }, categories, user] =
    await Promise.all([
      cat ? getCategoryProducts(cat, sp) : getSearchResults(sp),
      getCategories(),
      getCurrentUser(),
    ]);
  const items = await withWishlistState(user?.id, rawItems);

  const order = Object.keys(CATEGORY_ICONS);
  const sortedCats = [...categories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-1">
      {/* Keep an accessible/SEO heading without the visible banner. */}
      <h1 className="sr-only">Shop {STORE.name}</h1>

      {/* Categories on mobile (desktop uses the sidebar below). */}
      <div className="lg:hidden">
        <CategoryRail categories={sortedCats} />
      </div>

      {/* Across the whole catalog the size list is huge and meaningless — keep
          categories/price/availability; sizes stay on the scoped category pages. */}
      <ResultsBrowser
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        facets={{ ...facets, sizes: [] }}
        basePath="/"
        searchParams={sp}
        activeSlug={cat}
        categoryMode="filter"
        flush
        empty={
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="mb-3 text-4xl">🛒</div>
            <p className="text-base font-extrabold text-foreground">No products match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing the filters.</p>
          </div>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-5 rounded-3xl border border-border bg-muted/40 p-6 sm:grid-cols-3">
        {TRUST_POINTS.map((t) => (
          <div key={t.title} className="flex gap-3">
            <span className="text-xl">{t.icon}</span>
            <div>
              <p className="text-sm font-extrabold text-foreground">{t.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
