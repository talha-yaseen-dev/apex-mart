/**
 * Hardcoded delivery configuration for Mart Shop.
 *
 * Decision: no admin delivery config (that screen is out of scope). Zones, fees,
 * and 2-hour slots live here as static data, matching the Claude Design mockup
 * (6 residential zones, free delivery over Rs. 1,500, Rs. 120 flat below).
 * All money is integer minor units (paisa); display via lib/format.formatPKR.
 */

export type DeliveryZone = {
  id: string;
  name: string;
  /** Flat delivery fee (paisa) charged when the subtotal is below the threshold. */
  feeMinor: number;
};

/** Free delivery at/above this subtotal — Rs. 1,500. */
export const FREE_DELIVERY_THRESHOLD_MINOR = 150_000;
/** Default flat fee below the threshold — Rs. 120. */
export const FLAT_DELIVERY_FEE_MINOR = 12_000;

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "downtown", name: "Downtown & City Centre", feeMinor: FLAT_DELIVERY_FEE_MINOR },
  { id: "north", name: "North Residential", feeMinor: FLAT_DELIVERY_FEE_MINOR },
  { id: "south", name: "South District", feeMinor: FLAT_DELIVERY_FEE_MINOR },
  { id: "east", name: "East Suburbs", feeMinor: 15_000 },
  { id: "west", name: "West Suburbs", feeMinor: 15_000 },
  { id: "industrial", name: "Industrial Area", feeMinor: 20_000 },
];

export const DEFAULT_ZONE_ID = DELIVERY_ZONES[0].id;

/** Two-hour delivery windows, 8am–8pm, seven days a week. */
export const DELIVERY_SLOTS: string[] = [
  "8:00 – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 – 2:00 PM",
  "2:00 – 4:00 PM",
  "4:00 – 6:00 PM",
  "6:00 – 8:00 PM",
];

/** Order cutoff for same-day dispatch. */
export const SAME_DAY_CUTOFF = "6pm";

/** Static delivery estimate shown on product pages. */
export const DELIVERY_ESTIMATE = "Delivery in 2 hours to selected zones";

/**
 * Store profile (address, hours, contact) used across the shell and About page.
 *
 * Contact (phone / WhatsApp / country) below are the real business values.
 * ⚠️ The location + hours values are still PLACEHOLDERS: replace every field
 * marked TODO(owner) with the real business details before launch — the About
 * page renders them verbatim and also emits them as LocalBusiness structured
 * data for Google, so wrong values here mislead customers and search engines.
 * Nothing here is fabricated as "real"; the About page flags each remaining as
 * TODO. There is deliberately no `email` field — the store is contacted via
 * WhatsApp (wa.me/<STORE.whatsapp>), not email.
 */
export const STORE = {
  name: "Mart Shop",
  tagline: "Your local mini-mart",
  phone: "0342-4348110",
  /** WhatsApp number in E.164 without the leading + (used in wa.me links). */
  whatsapp: "923424348110",
  /** Human-readable opening hours shown on the About page. */
  hours: "8am – 11pm daily", // TODO(owner): confirm; note weekend hours if different
  /** schema.org openingHours form of the same hours, for LocalBusiness JSON-LD. */
  openingHours: "Mo-Su 08:00-23:00", // TODO(owner): keep in sync with `hours`
  /** Single-line street address (shown as-is + used as PostalAddress.streetAddress). */
  address: "12 Main Street, Local Market", // TODO(owner): full street address
  /** Structured PostalAddress parts for LocalBusiness JSON-LD (stronger local
   *  SEO). Empty until known — the About page flags each, and the JSON-LD omits
   *  any part left blank rather than emit an empty field. */
  addressLocality: "", // TODO(owner): city / town
  addressRegion: "", // TODO(owner): province / state
  postalCode: "", // TODO(owner): postal code
  /** ISO 3166-1 alpha-2 country for the structured PostalAddress. */
  country: "PK",
} as const;

/**
 * Map coordinates for schema.org `geo`. Left null until the real location is
 * known — the About page omits geo entirely rather than guess a pin.
 * TODO(owner): set `{ latitude, longitude }` to add a map point for local SEO.
 */
export const STORE_GEO: { latitude: number; longitude: number } | null = null;

export function zoneById(id: string | null | undefined): DeliveryZone {
  return DELIVERY_ZONES.find((z) => z.id === id) ?? DELIVERY_ZONES[0];
}
