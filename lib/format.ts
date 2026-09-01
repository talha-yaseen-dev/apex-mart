/**
 * Storefront money formatting for Mart Shop.
 *
 * All catalogue prices are stored as integer minor units (paisa) with currency
 * PKR. Pakistani retail prices are whole rupees, so we show "Rs. 1,234" with no
 * sub-rupee part. The currency-generic `formatMoney` in lib/utils.ts is left as
 * the backend/email formatter; this module is the PKR-facing presenter the UI
 * imports.
 */

/** Format integer minor units (paisa) as whole-rupee PKR, e.g. `Rs. 1,234`. */
export function formatPKR(minorUnits: number): string {
  const rupees = Math.round((minorUnits ?? 0) / 100);
  return `Rs. ${rupees.toLocaleString("en-PK")}`;
}

/** Format a date as `5 Sep 2026` (stable, locale-independent output). */
export function formatDate(d: Date | string | number): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Currency-aware storefront price. Defaults to PKR (the mart's currency). Any
 * other currency falls back to the standard Intl currency formatter so the
 * helper stays correct if a non-PKR value ever flows through.
 */
export function formatPrice(minorUnits: number, currency = "PKR"): string {
  if (currency.toUpperCase() === "PKR") return formatPKR(minorUnits);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format((minorUnits ?? 0) / 100);
}
