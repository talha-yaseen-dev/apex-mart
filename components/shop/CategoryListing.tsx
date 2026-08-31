import Link from "next/link";
import { getCategoryProducts } from "@/lib/storefront";
import { CATEGORY_ICONS, saleOriginalMinor } from "@/lib/home-content";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";
import { FilterControls } from "./FilterControls";
import { MobileFilters } from "./MobileFilters";
import { Pagination } from "./Pagination";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

type CategoryListingProps = {
  /** Category slug to fetch (cat=slug) — the category or subcategory. */
  slug: string;
  title: string;
  tagline: string;
  /** Route path for pagination/links, e.g. /c/grocery. */
  basePath: string;
  breadcrumb: Crumb[];
  searchParams: Record<string, string | string[] | undefined>;
};

/** Shared category / subcategory listing: banner, facets, sort, grid, pager. */
export async function CategoryListing({
  slug,
  title,
  tagline,
  basePath,
  breadcrumb,
  searchParams,
}: CategoryListingProps) {
  const { items, total, page, totalPages, facets } = await getCategoryProducts(
    slug,
    searchParams,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Breadcrumbs items={breadcrumb} />

      {/* Static banner slot */}
      <div className="mt-3 flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background text-3xl shadow-sm">
          {CATEGORY_ICONS[slug] ?? "🛒"}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </div>
      </div>

      {/* Sticky sort/filter sub-header (sits under the shell header) */}
      <div className="sticky top-[136px] z-30 -mx-4 mt-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:top-[84px]">
        <span className="text-xs font-bold text-muted-foreground">
          {total} {total === 1 ? "product" : "products"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <MobileFilters colors={facets.colors} sizes={facets.sizes} />
          <SortSelect />
        </div>
      </div>

      <div className="mt-4 flex gap-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-[100px]">
            <FilterControls colors={facets.colors} sizes={facets.sizes} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <div className="mb-3 text-4xl">🔍</div>
              <p className="text-base font-extrabold text-foreground">No products match</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing your filters.
              </p>
              <Link
                href={basePath}
                className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((card) => (
                <ProductCard
                  key={card.slug}
                  card={card}
                  originalMinor={saleOriginalMinor(card.slug)}
                />
              ))}
            </div>
          )}

          <Pagination
            basePath={basePath}
            page={page}
            totalPages={totalPages}
            searchParams={searchParams}
          />
        </div>
      </div>
    </div>
  );
}
