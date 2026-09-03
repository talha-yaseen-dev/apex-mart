/**
 * Hardcoded delivery configuration for Apex Mart.
 *
 * Decision: no admin delivery config (that screen is out of scope). The zone,
 * fee, and 2-hour slots live here as static data: Apex Mart delivers a single
 * city zone (Sargodha City) at a flat Rs.100, free over Rs.1,000.
 * All money is integer minor units (paisa); display via lib/format.formatPKR.
 */

export type DeliveryZone = {
  id: string;
  name: string;
  /** Flat delivery fee (paisa) charged when the subtotal is below the threshold. */
  feeMinor: number;
  /** Free-delivery threshold (paisa) for this zone. Mirrors the global
   *  FREE_DELIVERY_THRESHOLD_MINOR that checkout currently consumes. */
  freeThresholdMinor: number;
};

/** Free delivery at/above this subtotal — Rs. 1,000. */
export const FREE_DELIVERY_THRESHOLD_MINOR = 100_000;
/** Flat fee below the threshold — Rs. 100. */
export const FLAT_DELIVERY_FEE_MINOR = 10_000;

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "sargodha",
    name: "Sargodha City",
    feeMinor: FLAT_DELIVERY_FEE_MINOR, // Rs.100
    freeThresholdMinor: FREE_DELIVERY_THRESHOLD_MINOR, // free over Rs.1,000
  },
];

export const DEFAULT_ZONE_ID = DELIVERY_ZONES[0].id;

/** Two-hour delivery windows, 8am–10pm, seven days a week. */
export const DELIVERY_SLOTS: string[] = [
  "8:00 – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 – 2:00 PM",
  "2:00 – 4:00 PM",
  "4:00 – 6:00 PM",
  "6:00 – 8:00 PM",
  "8:00 – 10:00 PM",
];

/** Order cutoff for same-day dispatch. */
export const SAME_DAY_CUTOFF = "6pm";

/** Static delivery estimate shown on product pages. */
export const DELIVERY_ESTIMATE = "Delivery in 2 hours across Sargodha City";

/**
 * Store profile (address, hours, contact) used across the shell and About page.
 * These are Apex Mart's real business details — the About page renders them
 * verbatim and also emits them as LocalBusiness structured data for Google.
 * There is deliberately no `email` field — the store is contacted via WhatsApp
 * (wa.me/<STORE.whatsapp>), not email.
 */
export const STORE = {
  name: "Apex Mart",
  displayName: "Apex Mart",
  tagline: "Your local mini-mart",
  phone: "0342-4348110",
  /** WhatsApp number in E.164 without the leading + (used in wa.me links). */
  whatsapp: "923424348110",
  /** Human-readable opening hours shown on the About page. */
  hours: "8:00 AM – 10:00 PM daily",
  /** schema.org openingHours form of the same hours, for LocalBusiness JSON-LD. */
  openingHours: "Mo-Su 08:00-22:00",
  /** Single-line street address (shown as-is + used as PostalAddress.streetAddress). */
  address: "House P-108, Street 1, Muqam-e-Hayat",
  /** City / town (PostalAddress.addressLocality in the About JSON-LD). */
  city: "Sargodha",
  /** Province / state (PostalAddress.addressRegion). */
  region: "Punjab",
  /** Postal code (PostalAddress.postalCode). */
  postalCode: "40100",
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
