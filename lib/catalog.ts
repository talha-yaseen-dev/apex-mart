import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { StoreCard } from "@/lib/catalog-filter";
import { TYRE_CATEGORY_SLUGS } from "@/lib/tyres";

export type { StoreCard } from "@/lib/catalog-filter";

// ── Query shape ───────────────────────────────────────────────
// Full include for the product-detail page, which renders the whole gallery.
const productInclude = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { priceMinor: "asc" } },
  category: true,
  reviews: { select: { rating: true } },
} satisfies Prisma.ProductInclude;

// Lightweight include for grid cards. A card only ever uses its first image
// (see toCard), and admin-uploaded images are stored as base64 data URLs — so
// including *every* image of *every* active product (as the detail include
// does) pulled megabytes of base64 into the cached card list and made the
// storefront stutter as the catalog grew. Fetch just the first image's id/url.
export const cardInclude = {
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: { id: true, url: true },
  },
  variants: { orderBy: { priceMinor: "asc" } },
  category: true,
  reviews: { select: { rating: true } },
} satisfies Prisma.ProductInclude;

export type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

type Attrs = Record<string, string>;
const attrsOf = (v: { attributes: Prisma.JsonValue }): Attrs =>
  (v.attributes as Attrs) ?? {};

// ── Derivations ───────────────────────────────────────────────
export type Axis = { name: string; options: string[] };

export function deriveAxes(p: CardRow): Axis[] {
  const map = new Map<string, Set<string>>();
  for (const v of p.variants) {
    for (const [k, val] of Object.entries(attrsOf(v))) {
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(val);
    }
  }
  return [...map.entries()].map(([name, set]) => ({
    name,
    options: [...set],
  }));
}

const colorKey = (p: CardRow) =>
  deriveAxes(p).find((a) => /colou?r/i.test(a.name))?.name ?? null;

export function colorsOf(p: CardRow): string[] {
  const key = colorKey(p);
  if (!key) return [];
  return [
    ...new Set(
      p.variants
        .map((v) => attrsOf(v)[key])
        .filter((x): x is string => Boolean(x)),
    ),
  ];
}

const sizeKey = (p: CardRow) =>
  deriveAxes(p).find((a) => /size/i.test(a.name))?.name ?? null;

const sizesOf = (p: CardRow): string[] => {
  const key = sizeKey(p);
  if (!key) return [];
  return [
    ...new Set(
      p.variants
        .map((v) => attrsOf(v)[key])
        .filter((x): x is string => Boolean(x)),
    ),
  ];
};

const minPriceOf = (p: CardRow) =>
  p.variants.length ? Math.min(...p.variants.map((v) => v.priceMinor)) : 0;

const inStockOf = (p: CardRow) => p.variants.some((v) => v.stock > 0);

function ratingOf(reviews: { rating: number }[]) {
  if (!reviews.length) return { avg: 0, count: 0 };
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { avg, count: reviews.length };
}

// ── Public card shape (type lives in the client-safe filter module) ──
export function toCard(p: CardRow): StoreCard {
  const { avg, count } = ratingOf(p.reviews);
  // Variants are ordered by priceMinor asc, so the first is the cheapest — the
  // one whose price the card shows. Surface its tyre size when available.
  const cheapest = p.variants[0];
  const cheapestAttrs = cheapest ? attrsOf(cheapest) : {};
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    variantId: cheapest?.id ?? null,
    pack: cheapestAttrs.size ?? cheapestAttrs.packSize ?? cheapestAttrs.pack ?? null,
    unitPrice: cheapestAttrs.unitPrice ?? null,
    // Keep the raw url here (data URL or remote) so the cached card + the
    // native REST client stay self-contained; the web render swaps data URLs
    // for /api/images/<imageId> via webImageUrl().
    image: p.images[0]?.url ?? null,
    imageId: p.images[0]?.id ?? null,
    minPriceMinor: minPriceOf(p),
    rating: avg,
    reviewCount: count,
    colors: colorsOf(p),
    sizes: sizesOf(p),
    inStock: inStockOf(p),
    createdAt: new Date(p.createdAt).toISOString(),
    skus: p.variants.map((v) => v.sku),
  };
}

// ── Cached active catalog as lightweight cards (tag: "catalog") ──────
// The full active set is small and already filtered/sorted in-memory, so we
// cache the whole card list once and let both the initial server render and the
// browser filter it instantly — no per-keystroke / per-filter server round-trip.
export const getActiveCards = unstable_cache(
  async (): Promise<StoreCard[]> => {
    const rows = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, category: { slug: { in: [...TYRE_CATEGORY_SLUGS] } } },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCard);
  },
  ["catalog:cards:v3"],
  { tags: ["catalog"], revalidate: 300 },
);

// ── Product detail (tags: "catalog" + "product:<slug>") ────────
export function getProductDetail(slug: string) {
  return unstable_cache(
    async () => {
      const p = await prisma.product.findFirst({
        where: { slug, status: "ACTIVE", deletedAt: null, category: { slug: { in: [...TYRE_CATEGORY_SLUGS] } } },
        include: {
          ...productInclude,
          reviews: {
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!p) return null;

      const dist = [5, 4, 3, 2, 1].map((star) => {
        const n = p.reviews.filter((r) => r.rating === star).length;
        return {
          star,
          count: n,
          pct: p.reviews.length
            ? Math.round((n / p.reviews.length) * 100)
            : 0,
        };
      });
      const { avg, count } = ratingOf(p.reviews);

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        categoryName: p.category.name,
        categorySlug: p.category.slug,
        images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
        axes: deriveAxes(p),
        colors: colorsOf(p),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          priceMinor: v.priceMinor,
          stock: v.stock,
          attrs: attrsOf(v),
        })),
        minPriceMinor: minPriceOf(p),
        rating: avg,
        reviewCount: count,
        distribution: dist,
        reviews: p.reviews.slice(0, 8).map((r) => ({
          name: r.user.name,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt,
        })),
      };
    },
    ["product", slug],
    { tags: [`product:${slug}`, "catalog"], revalidate: 300 },
  )();
}

export type ProductDetail = NonNullable<
  Awaited<ReturnType<typeof getProductDetail>>
>;
