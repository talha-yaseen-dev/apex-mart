import type { StoreCard } from "@/lib/catalog-filter";
import type { CatalogFacets } from "@/lib/storefront";
import { saleOriginalMinor } from "@/lib/home-content";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";
import { MobileFilters } from "./MobileFilters";
import { FilterControls } from "./FilterControls";
import { CategoryNav } from "./CategoryNav";
import { Pagination } from "./Pagination";

type ResultsBrowserProps = {
  items: StoreCard[];
  total: number;
  page: number;
  totalPages: number;
  facets: CatalogFacets;
  /** Route path for pagination links, e.g. /c/grocery or /search. */
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Current aisle slug (category pages) / active `?cat=` (home), highlighted. */
  activeSlug?: string;
  /** "filter" (home): sidebar categories set `?cat=` in place; "link": go to /c/[slug]. */
  categoryMode?: "link" | "filter";
  /** Drop the sub-header's top margin — for pages with no banner above it (home). */
  flush?: boolean;
  /** Rendered inside the grid column when `items` is empty (page-specific copy). */
  empty: React.ReactNode;
};

/**
 * Shared faceted listing chrome: the sticky sort/filter sub-header, the desktop
 * facets sidebar / mobile bottom-sheet, the responsive product grid, and SSR
 * pagination. Used by the category pages and search results so both stay in sync
 * — the only thing that differs is the header above it and the empty-state copy.
 */
export function ResultsBrowser({
  items,
  total,
  page,
  totalPages,
  facets,
  basePath,
  searchParams,
  activeSlug,
  categoryMode = "link",
  flush = false,
  empty,
}: ResultsBrowserProps) {
  return (
    <>
      {/* Sticky sort/filter sub-header (sits under the shell header) */}
      <div
        className={`sticky top-[136px] z-30 -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:top-[84px] ${flush ? "" : "mt-4"}`}
      >
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
            {/* Categories sit above the price/other filters. */}
            <CategoryNav activeSlug={activeSlug} mode={categoryMode} />
            <FilterControls colors={facets.colors} sizes={facets.sizes} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {items.length === 0 ? (
            empty
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
    </>
  );
}
