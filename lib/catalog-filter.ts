/**
 * Client-safe catalog filtering. Pure functions over the lightweight card shape
 * — no Prisma, no `server-only` — so the exact same filter/sort/paginate logic
 * runs on the server for the initial render AND in the browser for instant,
 * navigation-free search & filtering. Keep this module free of server imports.
 */

export type StoreCard = {
  /** Product id — used to toggle/check wishlist membership. */
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryName: string;
  categorySlug: string;
  image: string | null;
  /** ProductImage id of the primary image — lets the web render swap a heavy
   *  base64 data-URL image for the lightweight `/api/images/<id>` route. */
  imageId: string | null;
  minPriceMinor: number;
  /** Cheapest variant's id — the default add-to-cart target from a grid card. */
  variantId: string | null;
  /** Cheapest variant's pack label (e.g. "5kg") from variant.attributes.packSize. */
  pack: string | null;
  /** Cheapest variant's per-unit price (e.g. "Rs. 224/kg") from attributes. */
  unitPrice: string | null;
  rating: number;
  reviewCount: number;
  colors: string[];
  sizes: string[];
  inStock: boolean;
  /** ISO string (dates serialize to strings through the cache / RSC payload). */
  createdAt: string;
  /** Variant SKUs, included so search can match them. */
  skus: string[];
  /** Whether the current user has this product in their wishlist. Attached
   *  per-request server-side (see withWishlistState); absent for the cached,
   *  user-agnostic catalog and for signed-out visitors. */
  isSaved?: boolean;
};

export type CatalogParams = {
  q: string;
  cat: string; // category slug or "all"
  sort: string;
  min: number | null;
  max: number | null;
  colors: string[];
  sizes: string[];
  inStock: boolean;
  page: number;
};

// 24 fills complete rows at every grid width — the storefront grid is 2 cols
// (mobile), 3 (sm/lg), and 4 (xl), and 24 is divisible by all three, so no page
// ever ends in a ragged, half-empty row. 24 = ~6 rows on desktop (a fuller first
// screen than 12) and halves the pagination on the home listing.
export const PER_PAGE = 24;

export const EMPTY_PARAMS: CatalogParams = {
  q: "",
  cat: "all",
  sort: "featured",
  min: null,
  max: null,
  colors: [],
  sizes: [],
  inStock: false,
  page: 1,
};

/**
 * Product images uploaded through the admin are stored as base64 data URLs.
 * Inlining them in the storefront/RSC payload adds ~70 KB per card, so the web
 * render swaps a data-URL image for `/api/images/<id>` (a short same-origin URL
 * that streams the bytes on demand and can be optimized by next/image). Remote
 * URLs (pasted links / CDN) pass through unchanged. Pure + client-safe.
 */
export function webImageUrl(url: string | null, id: string | null): string | null {
  return url && id && url.startsWith("data:") ? `/api/images/${id}` : url;
}

type SP = Record<string, string | string[] | undefined>;

export function parseCatalogParams(sp: SP): CatalogParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const many = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? [v] : []).flatMap((s) => s.split(",")).filter(Boolean);
  const num = (v: string | string[] | undefined) => {
    const n = parseInt(String(one(v) ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    // Cap query length defensively (validation parity with server search).
    q: (one(sp.q) ?? "").trim().slice(0, 100),
    cat: one(sp.cat) ?? "all",
    sort: one(sp.sort) ?? "featured",
    min: num(sp.min),
    max: num(sp.max),
    colors: many(sp.color),
    sizes: many(sp.size),
    inStock: one(sp.stock) === "1",
    page: Math.max(1, num(sp.page) ?? 1),
  };
}

/** Serialize params back to a query string (stable order; omits defaults). */
export function paramsToQueryString(p: CatalogParams): string {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.cat !== "all") qs.set("cat", p.cat);
  if (p.sort !== "featured") qs.set("sort", p.sort);
  if (p.min != null) qs.set("min", String(p.min));
  if (p.max != null) qs.set("max", String(p.max));
  if (p.colors.length) qs.set("color", p.colors.join(","));
  if (p.sizes.length) qs.set("size", p.sizes.join(","));
  if (p.inStock) qs.set("stock", "1");
  if (p.page > 1) qs.set("page", String(p.page));
  return qs.toString();
}

export function activeFilterCount(p: CatalogParams): number {
  return (
    (p.cat !== "all" ? 1 : 0) +
    (p.min != null ? 1 : 0) +
    (p.max != null ? 1 : 0) +
    p.colors.length +
    p.sizes.length +
    (p.inStock ? 1 : 0) +
    (p.q ? 1 : 0)
  );
}

export type Facets = {
  categories: { slug: string; name: string; count: number }[];
  colors: string[];
  sizes: string[];
};

export function computeFacets(cards: StoreCard[]): Facets {
  const categories = new Map<string, { name: string; count: number }>();
  const colors = new Set<string>();
  const sizes = new Set<string>();
  for (const c of cards) {
    const entry = categories.get(c.categorySlug) ?? { name: c.categoryName, count: 0 };
    entry.count++;
    categories.set(c.categorySlug, entry);
    c.colors.forEach((x) => colors.add(x));
    c.sizes.forEach((x) => sizes.add(x));
  }
  return {
    categories: [...categories.entries()].map(([slug, v]) => ({
      slug,
      name: v.name,
      count: v.count,
    })),
    colors: [...colors],
    sizes: [...sizes],
  };
}

/** Apply search + filters + sort (no pagination). Case-insensitive, trimmed. */
export function filterSort(cards: StoreCard[], p: CatalogParams): StoreCard[] {
  let rows = cards;

  const q = p.q.trim().toLowerCase();
  if (q) {
    rows = rows.filter((c) => {
      const haystack = `${c.name} ${c.brand ?? ""} ${c.categoryName} ${c.skus.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }
  if (p.cat !== "all") rows = rows.filter((c) => c.categorySlug === p.cat);
  if (p.min != null) rows = rows.filter((c) => c.minPriceMinor >= p.min! * 100);
  if (p.max != null) rows = rows.filter((c) => c.minPriceMinor <= p.max! * 100);
  if (p.colors.length) rows = rows.filter((c) => c.colors.some((x) => p.colors.includes(x)));
  if (p.sizes.length) rows = rows.filter((c) => c.sizes.some((x) => p.sizes.includes(x)));
  if (p.inStock) rows = rows.filter((c) => c.inStock);

  switch (p.sort) {
    case "price-asc":
      rows = [...rows].sort((a, b) => a.minPriceMinor - b.minPriceMinor);
      break;
    case "price-desc":
      rows = [...rows].sort((a, b) => b.minPriceMinor - a.minPriceMinor);
      break;
    case "rating":
      rows = [...rows].sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      rows = [...rows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    // "featured" keeps the incoming order (createdAt desc from the query).
  }
  return rows;
}

/** Full pipeline: filter + sort + clamp page + slice. */
export function filterSortPaginate(cards: StoreCard[], p: CatalogParams) {
  const rows = filterSort(cards, p);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, p.page), totalPages);
  const items = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return { items, total, page, totalPages };
}
