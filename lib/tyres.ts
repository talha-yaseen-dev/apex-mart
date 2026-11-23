/** Public catalogue is deliberately limited to these vehicle categories. */
export const TYRE_CATEGORY_SLUGS = ["bike-tyres", "car-tyres", "truck-tyres"] as const;

export const isTyreCategory = (slug: string): boolean =>
  TYRE_CATEGORY_SLUGS.includes(slug as (typeof TYRE_CATEGORY_SLUGS)[number]);
