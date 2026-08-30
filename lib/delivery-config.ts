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

/** Store profile (address, hours, contact) used across the shell and About page. */
export const STORE = {
  name: "Mart Shop",
  tagline: "Your local mini-mart",
  phone: "0321-1234567",
  whatsapp: "923211234567",
  hours: "8am – 11pm daily",
  address: "12 Main Street, Local Market",
} as const;

export function zoneById(id: string | null | undefined): DeliveryZone {
  return DELIVERY_ZONES.find((z) => z.id === id) ?? DELIVERY_ZONES[0];
}
