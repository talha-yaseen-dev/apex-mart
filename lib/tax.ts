/**
 * Tax strategy — resolved per destination country at runtime (a new region is
 * a new entry, no checkout edits). Rates are illustrative. Client-safe.
 */
const RATES: Record<string, number> = {
  US: 0.0875,
  CA: 0.05,
  GB: 0.2,
  PK: 0.18, // Pakistan general sales tax
};

export function taxRateFor(country: string): number {
  return RATES[country] ?? 0.0875;
}

export function calcTaxMinor(taxableMinor: number, country: string): number {
  return Math.max(0, Math.round(taxableMinor * taxRateFor(country)));
}
