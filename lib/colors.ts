/**
 * Map a human colour name (from variant attributes) to an OKLCH swatch.
 * Client-safe (no server imports) so both server cards and client selectors
 * can render swatches. Keyword match first, deterministic hash fallback.
 */
const KEYWORDS: [RegExp, string][] = [
  [/black|midnight|graphite|charcoal|onyx/i, "oklch(0.3 0.01 250)"],
  [/white|ivory|chalk/i, "oklch(0.93 0.004 200)"],
  [/silver|grey|gray/i, "oklch(0.82 0.006 240)"],
  [/slate|steel/i, "oklch(0.6 0.02 240)"],
  [/navy|indigo/i, "oklch(0.38 0.06 260)"],
  [/blue/i, "oklch(0.55 0.12 250)"],
  [/olive|forest|pine|sage/i, "oklch(0.5 0.07 150)"],
  [/green/i, "oklch(0.55 0.11 150)"],
  [/clay|terra|rust|copper/i, "oklch(0.6 0.09 40)"],
  [/red|crimson|berry/i, "oklch(0.55 0.16 25)"],
  [/brown|tan|sand|khaki/i, "oklch(0.68 0.06 70)"],
  [/purple|plum|violet/i, "oklch(0.5 0.13 320)"],
  [/pink/i, "oklch(0.7 0.12 350)"],
  [/yellow|gold|amber/i, "oklch(0.8 0.13 90)"],
];

export function colorHex(name: string): string {
  for (const [re, hex] of KEYWORDS) if (re.test(name)) return hex;
  // Deterministic fallback hue from the name.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `oklch(0.6 0.08 ${h})`;
}

/** Gradient tile used as an image placeholder / thumbnail background. */
export function tile(name: string): string {
  const h = colorHex(name);
  return `linear-gradient(150deg, ${h}, color-mix(in oklch, ${h} 78%, black))`;
}
