/**
 * Static search merchandising for Apex Tyres.
 *
 * There is no search-analytics pipeline yet (real "trending"/"popular searches"
 * needs event capture — Phase 3), so the terms shown on the empty /search page
 * are a merchant-authored list, mirroring the static-merchandising approach in
 * lib/home-content. Each links to /search?q=<term>.
 */
export const TRENDING_SEARCHES: string[] = [
  "motorcycle tyre",
  "car tyre",
  "truck tyre",
  "175/65 R14",
  "195/65 R15",
  "11R22.5",
];
