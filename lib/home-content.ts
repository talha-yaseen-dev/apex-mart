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
    "Browse tyres by vehicle and size. Compare options, check availability, and order with cash on delivery in Sargodha.",
  ctaLabel: "Browse tyres",
  ctaHref: "#shop",
  image: "/tyres/hero.svg",
  cards: [
    { icon: "💵", title: "Cash on Delivery", body: "No advance payment. Pay the rider at your door." },
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
  { icon: "🚚", title: "Sargodha delivery", body: "Choose an available delivery slot at checkout." },
  { icon: "💵", title: "Pay on delivery", body: "Cash at your door. Nothing upfront." },
  { icon: "📏", title: "Check your tyre size", body: "Confirm the size on your vehicle before ordering." },
] as const;
