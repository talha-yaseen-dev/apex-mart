/**
 * Static home-page merchandising for Apex Tyres.
 *
 * There is no merchandising CMS (that's Phase 5), so the hero, the curated
 * "Popular" picks, and the promotional "was" prices for the sale rail live here
 * as merchant-authored config — the sanctioned static-merchandising approach.
 * The live price for every product still comes from /api/v1/catalog; SALE only
 * declares the promotional original (compare-at) price.
 */

export const HERO = {
  eyebrow: "Bike · Car · Truck tyres",
  title: "Find the right tyres for the road ahead.",
  subtitle:
    "Explore genuine tyre models for bikes, cars and trucks. Compare sizes, see PKR prices and place your order online.",
  ctaLabel: "Browse tyres",
  ctaHref: "#shop",
  image: "/tyres/hero.svg",
  cards: [
    { icon: "🛒", title: "Order online", body: "Add your tyre to cart and complete checkout." },
    { icon: "📏", title: "Shop by size", body: "Use the size filter to narrow down compatible tyres." },
  ],
} as const;

/** Emoji per tyre category slug. */
export const CATEGORY_ICONS: Record<string, string> = {
  "bike-tyres": "🏍️",
  "car-tyres": "🚗",
  "truck-tyres": "🚛",
};

/** Curated "Popular this week" picks (product slugs), one merchandising choice. */
export const POPULAR_SLUGS: string[] = [];

/**
 * Active promotions: product slug → original (compare-at) price in whole rupees.
 * Must be higher than the product's current cheapest price. The card renders the
 * strike-through original + a computed discount badge.
 */
export const SALE: Record<string, number> = {};

export const JUST_ARRIVED_LIMIT = 8;

/** Promotional compare-at price (paisa) for a product, or null if not on sale. */
export const saleOriginalMinor = (slug: string): number | null =>
  SALE[slug] != null ? SALE[slug] * 100 : null;

/** Compact trust points shown under the product sections. */
export const TRUST_POINTS = [
  { icon: "🛞", title: "Real tyre models", body: "Browse manufacturer-backed product details and images." },
  { icon: "🛒", title: "Easy checkout", body: "See PKR prices, order online and pay on delivery." },
  { icon: "📏", title: "Check your tyre size", body: "Confirm the size on your vehicle before ordering." },
] as const;
