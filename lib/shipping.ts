/**
 * Shipping strategy — flat-rate registry keyed by method. Standard is free over
 * $50. A carrier integration would implement the same shape. Client-safe.
 */
export type ShippingRate = {
  key: string;
  name: string;
  eta: string;
  minor: number;
};

export function shippingRates(subtotalMinor: number): ShippingRate[] {
  return [
    {
      key: "standard",
      name: "Standard",
      eta: "5–7 business days",
      minor: subtotalMinor >= 5000 ? 0 : 599,
    },
    { key: "express", name: "Express", eta: "2–3 business days", minor: 1499 },
    { key: "overnight", name: "Overnight", eta: "Next business day", minor: 2999 },
  ];
}

export function shippingRate(subtotalMinor: number, key: string): ShippingRate {
  const rates = shippingRates(subtotalMinor);
  return rates.find((r) => r.key === key) ?? rates[0]!;
}
