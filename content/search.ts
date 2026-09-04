/**
 * Static search merchandising for Apex Mart.
 *
 * There is no search-analytics pipeline yet (real "trending"/"popular searches"
 * needs event capture — Phase 3), so the terms shown on the empty /search page
 * are a merchant-authored list, mirroring the static-merchandising approach in
 * lib/home-content. Each links to /search?q=<term>.
 */
export const TRENDING_SEARCHES: string[] = [
  "atta",
  "doodh",
  "chawal",
  "cooking oil",
  "biscuits",
  "shampoo",
];
