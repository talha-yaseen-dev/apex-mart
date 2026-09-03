import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getSearchResults, type CatalogFacets } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { withWishlistState } from "@/lib/account";
import { parseCatalogParams } from "@/lib/catalog-filter";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { TRENDING_SEARCHES } from "@/content/search";
import { ResultsBrowser } from "@/components/shop/ResultsBrowser";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Same normalisation the filter uses, so metadata matches what the page renders. */
function queryOf(sp: Record<string, string | string[] | undefined>): string {
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return (raw ?? "").trim().slice(0, 100);
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const q = queryOf(await searchParams);

  // Empty query = the "start a search" landing page: no unique content to rank,
  // so keep it out of the index (crawlers should still follow to real results).
  if (!q) {
    return {
      title: "Search",
      description:
        "Search groceries, snacks and household essentials at Mart Shop. Cash on delivery, free delivery over Rs. 1,500.",
      robots: { index: false, follow: true },
    };
  }

  // A real query is long-tail SEO value — let it index, with a canonical that
  // drops filter/sort/page noise.
  return {
    title: `Search "${q}"`,
    description: `Search results for "${q}" at Mart Shop — PKR prices, cash on delivery, free delivery over Rs. 1,500.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(q)}` },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = parseCatalogParams(sp).q;

  // ── No query: trending searches + prompt to type ──────────────
  if (!q) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
            🔍
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Search Mart Shop
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find groceries, snacks and household essentials — start typing in the search bar above.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Trending searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="tap-target inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 text-sm font-bold text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Search className="size-3.5 text-muted-foreground" aria-hidden />
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── With a query: faceted results (or no-results state) ───────
  const { items: rawItems, total, page, totalPages, facets } =
    await getSearchResults(sp);
  const user = await getCurrentUser();
  const items = await withWishlistState(user?.id, rawItems);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: `Search: ${q}` }]}
      />

      <div className="mt-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Results for “{q}”
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "product" : "products"} found
        </p>
      </div>

      <ResultsBrowser
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        facets={facets}
        basePath="/search"
        searchParams={sp}
        empty={<NoResults q={q} categories={facets.categories} />}
      />
    </div>
  );
}

/**
 * No-results state. Nova's catalog does exact substring matching only — there's
 * no fuzzy / "did you mean" support — so we don't guess a correction; we point
 * the shopper at the busiest aisles to browse instead.
 */
function NoResults({
  q,
  categories,
}: {
  q: string;
  categories: CatalogFacets["categories"];
}) {
  const suggestions = [...categories].sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="mb-3 text-4xl">🔍</div>
      <p className="text-base font-extrabold text-foreground">
        No products match “{q}”
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Check the spelling, or try a shorter, more general term.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Try:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((c) => (
              <Link
                key={c.slug}
                href={`/c/${c.slug}`}
                className="tap-target inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 text-sm font-bold text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <span aria-hidden>{CATEGORY_ICONS[c.slug] ?? "🛒"}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
