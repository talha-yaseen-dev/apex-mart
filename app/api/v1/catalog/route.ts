import { getActiveCards } from "@/lib/catalog";
import {
  parseCatalogParams,
  filterSortPaginate,
  computeFacets,
} from "@/lib/catalog-filter";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";

export const OPTIONS = (req: Request) => preflight(req);

/**
 * Storefront listing: filter / sort / paginate over the cached active catalog.
 * Query params mirror the web storefront (q, cat, sort, min, max, color, size,
 * stock, page). This is anonymous public data with no user-specific content, so
 * the response is safe to cache at the CDN (s-maxage + stale-while-revalidate).
 */
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const sp: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(searchParams.keys())) {
    const all = searchParams.getAll(key);
    sp[key] = all.length > 1 ? all : all[0];
  }

  const cards = await getActiveCards();
  const params = parseCatalogParams(sp);
  const { items, total, page, totalPages } = filterSortPaginate(cards, params);

  const res = ok({ items, total, page, totalPages, facets: computeFacets(cards) });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600",
  );
  return res;
});
