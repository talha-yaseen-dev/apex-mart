import Link from "next/link";
import { getCategoryProducts } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { withWishlistState } from "@/lib/account";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { ResultsBrowser } from "./ResultsBrowser";
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
  const { items: rawItems, total, page, totalPages, facets } =
    await getCategoryProducts(slug, searchParams);
  const user = await getCurrentUser();
  const items = await withWishlistState(user?.id, rawItems);

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

      <ResultsBrowser
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        facets={facets}
        basePath={basePath}
        searchParams={searchParams}
        empty={
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="text-base font-extrabold text-foreground">No products match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing your filters.</p>
            <Link
              href={basePath}
              className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Clear filters
            </Link>
          </div>
        }
      />
    </div>
  );
}
