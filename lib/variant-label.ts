/** A short shopper-facing label; exclude descriptions and source links in attributes. */
export function formatVariantLabel(attrs: unknown): string {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return "Tyre";
  const data = attrs as Record<string, unknown>;
  const value = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  return [value("size") || value("packSize") || value("pack"), value("position")]
    .filter(Boolean)
    .join(" · ") || "Tyre";
}
