import "server-only";
import { headers } from "next/headers";
import type { StoreCard } from "@/lib/catalog-filter";

/**
 * Server-side reader for the public catalog. Per the build rules, storefront
 * pages get their data from /api/v1/* only — never Prisma directly — so this
 * fetches the existing catalog route and shares the typed response across the
 * home, category, and search pages.
 */

export type CatalogFacets = {
  categories: { slug: string; name: string; count: number }[];
  colors: string[];
  sizes: string[];
};

export type CatalogResponse = {
  items: StoreCard[];
  total: number;
  page: number;
  totalPages: number;
  facets: CatalogFacets;
};

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Fetch one catalog page (optionally filtered) from /api/v1/catalog. */
export async function getCatalog(
  search?: URLSearchParams,
): Promise<CatalogResponse> {
  const base = await baseUrl();
  const qs = search?.toString();
  const res = await fetch(`${base}/api/v1/catalog${qs ? `?${qs}` : ""}`, {
    next: { revalidate: 300, tags: ["catalog"] },
  });
  if (!res.ok) throw new Error(`catalog request failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as CatalogResponse;
}

/**
 * Fetch the full active catalog by walking the paginated API (the route caps a
 * page at 12; facets are already computed over the whole catalogue). Used by the
 * home page, whose curated rails reference products on any page. Capped to keep
 * a very large catalogue from fanning out unboundedly.
 */
export async function getAllCatalog(maxPages = 12): Promise<CatalogResponse> {
  const first = await getCatalog(new URLSearchParams({ page: "1" }));
  const items = [...first.items];
  const pages = Math.min(first.totalPages, maxPages);
  for (let p = 2; p <= pages; p++) {
    const next = await getCatalog(new URLSearchParams({ page: String(p) }));
    items.push(...next.items);
  }
  return { ...first, items };
}
