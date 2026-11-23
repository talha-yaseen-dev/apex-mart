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
  const params = new URLSearchParams(search);
  params.set("_catalog", "manufacturer-20261124");
  const res = await fetch(`${base}/api/v1/catalog?${params.toString()}`, {
    next: { revalidate: 300, tags: ["catalog"] },
  });
  if (!res.ok) throw new Error(`catalog request failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? json) as CatalogResponse;
}

export type ProductImageView = { id: string; url: string; alt: string };
export type ProductVariantView = {
  id: string;
  sku: string;
  priceMinor: number;
  stock: number;
  attrs: Record<string, string>;
};
export type ProductReviewView = {
  name: string | null;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
};
export type ProductDetailView = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryName: string;
  categorySlug: string;
  images: ProductImageView[];
  variants: ProductVariantView[];
  minPriceMinor: number;
  rating: number;
  reviewCount: number;
  reviews: ProductReviewView[];
};

/** Product detail from /api/v1/products/[slug]. Returns null on 404. */
export async function getProduct(slug: string): Promise<ProductDetailView | null> {
  const base = await baseUrl();
  const res = await fetch(
    `${base}/api/v1/products/${encodeURIComponent(slug)}`,
    { next: { revalidate: 300, tags: ["catalog", `product:${slug}`] } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`product request failed: ${res.status}`);
  const json = await res.json();
  if (json?.ok === false) return null;
  return (json.data ?? json) as ProductDetailView;
}

/** The catalog query params the /api/v1/catalog route actually reads. */
const CATALOG_PARAMS = ["q", "sort", "page", "stock", "min", "max", "color", "size"] as const;

/** All categories (with counts) from the catalog facets — used by the /c index. */
export async function getCategories(): Promise<CatalogFacets["categories"]> {
  const { facets } = await getCatalog();
  return facets.categories;
}

/**
 * Category listing: tyres in one vehicle category plus the shared facets. Only forwards
 * the params the catalog route understands (cat + q/sort/page/stock/min/max/
 * color/size) — no invented params. `sp` is the page's searchParams.
 */
export async function getCategoryProducts(
  slug: string,
  sp: Record<string, string | string[] | undefined> = {},
): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  params.set("cat", slug);
  for (const key of CATALOG_PARAMS) {
    const raw = sp[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  return getCatalog(params);
}

/**
 * Search listing: text query (`q`) across every category, plus the shared
 * facets/sort/pagination params. Same contract as getCategoryProducts but with
 * no `cat` lock — the catalog route matches `q` against product name, brand,
 * category name and SKU (substring, case-insensitive). `sp` is the page's
 * searchParams; only the params the catalog route understands are forwarded.
 */
export async function getSearchResults(
  sp: Record<string, string | string[] | undefined> = {},
): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  for (const key of CATALOG_PARAMS) {
    const raw = sp[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) params.set(key, value);
  }
  return getCatalog(params);
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
