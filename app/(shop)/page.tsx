import { getSearchResults, getCategoryProducts, getCategories } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { withWishlistState } from "@/lib/account";
import { CategoryRail } from "@/components/shop/CategoryRail";
import { CategoryTile } from "@/components/shop/CategoryTile";
import { ResultsBrowser } from "@/components/shop/ResultsBrowser";
import { HomeHero } from "@/components/shop/HomeHero";
import { TRUST_POINTS, CATEGORY_ICONS } from "@/lib/home-content";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Home = the full tyre listing. A brand banner, then the faceted
 * catalog (categories + price/availability filters in the left sidebar, product
 * grid, sort, pagination) over every product — the same chrome as the category
 * and search pages. Filters/sort/pagination drive `/?…` query params.
 */
export default async function HomePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  // A category click sets ?cat= — filter to that vehicle type in place (only the grid
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
    <div className="mx-auto max-w-[1600px] px-4 pb-4 pt-1">
      <HomeHero />

      {sortedCats.length > 0 && (
        <section className="hidden pt-7 lg:block" aria-labelledby="vehicle-heading">
          <h2 id="vehicle-heading" className="mb-3 text-xl font-extrabold tracking-tight text-foreground">
            Shop by vehicle
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {sortedCats.map((category) => (
              <CategoryTile
                key={category.slug}
                slug={category.slug}
                name={category.name}
                count={category.count}
                size="lg"
              />
            ))}
          </div>
        </section>
      )}

      <div id="shop" className="scroll-mt-32 pt-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Shop tyres</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose your vehicle type, then narrow by tyre size.</p>
      </div>

      {/* Categories on mobile (desktop uses the sidebar below). */}
      <div className="lg:hidden">
        <CategoryRail categories={sortedCats} />
      </div>

      <ResultsBrowser
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        facets={facets}
        basePath="/"
        searchParams={sp}
        activeSlug={cat}
        categoryMode="filter"
        flush
        empty={
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="mb-3 text-4xl">🛞</div>
            <p className="text-base font-extrabold text-foreground">No tyres match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different vehicle type or tyre size.</p>
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
