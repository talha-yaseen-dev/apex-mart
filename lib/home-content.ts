/**
 * Static home-page merchandising for Mart Shop.
 *
 * There is no merchandising CMS (that's Phase 5), so the hero, the curated
 * "Popular" picks, and the promotional "was" prices for the sale rail live here
 * as merchant-authored config — the sanctioned static-merchandising approach.
 * The live price for every product still comes from /api/v1/catalog; SALE only
 * declares the promotional original (compare-at) price.
 */

export const HERO = {
  eyebrow: "Groceries · Snacks · Household",
  title: "The whole shop, at your door today.",
  subtitle:
    "Over 500 everyday essentials in stock. Order before 6pm and pay cash when it arrives.",
  ctaLabel: "Start shopping",
  ctaHref: "#shop",
  image:
    "https://images.unsplash.com/photo-1606824722920-4c652a70f348?w=1200&h=600&fit=crop&auto=format",
  cards: [
    { icon: "💵", title: "Cash on Delivery", body: "No advance payment. Pay the rider at your door." },
    { icon: "⚡", title: "2-hour delivery", body: "Across six residential zones, seven days a week." },
  ],
} as const;

/** Emoji per category slug, mirroring the design's aisle icons. */
export const CATEGORY_ICONS: Record<string, string> = {
  grocery: "🌾",
  beverages: "🥤",
  snacks: "🍿",
  household: "🏠",
  "personal-care": "🧴",
  "baby-kids": "👶",
};

/** Curated "Popular this week" picks (product slugs), one merchandising choice. */
export const POPULAR_SLUGS: string[] = [
  "basmati-rice",
  "sufi-cooking-oil",
  "coca-cola",
  "lays-masala",
  "surf-excel-washing-powder",
  "head-shoulders-shampoo",
  "nido-milk-powder",
  "pampers-diapers-small",
];

/**
 * Active promotions: product slug → original (compare-at) price in whole rupees.
 * Must be higher than the product's current cheapest price. The card renders the
 * strike-through original + a computed discount badge.
 */
export const SALE: Record<string, number> = {
  "basmati-rice": 280,
  "sufi-cooking-oil": 680,
  "rooh-afza": 450,
  "daal-mash": 230,
  "nido-milk-powder": 950,
  "tang-orange": 190,
  "surf-excel-washing-powder": 300,
  "colgate-triple-action": 200,
};

export const JUST_ARRIVED_LIMIT = 8;

/** Promotional compare-at price (paisa) for a product, or null if not on sale. */
export const saleOriginalMinor = (slug: string): number | null =>
  SALE[slug] != null ? SALE[slug] * 100 : null;

/** Compact trust points shown under the product sections. */
export const TRUST_POINTS = [
  { icon: "🚚", title: "Free delivery over Rs. 1,500", body: "Rs. 120 flat below that. Same-day to most areas." },
  { icon: "💵", title: "Pay on delivery", body: "Cash at your door. Nothing upfront." },
  { icon: "↩️", title: "Wrong item? Send it back", body: "Refused at the door or returned within 24 hours." },
] as const;
