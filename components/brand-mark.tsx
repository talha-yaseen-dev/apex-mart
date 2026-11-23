import { cn } from "@/lib/utils";
import { STORE } from "@/lib/delivery-config";

/**
 * Apex Tyres brand mark — a tyre glyph in the brand colour. In the app chrome
 * the wordmark (STORE.name) sits beside it (headers, footer, auth panel).
 *
 * Flat and theme-aware: brand-coloured on normal surfaces, and white on
 * surfaces that are always dark regardless of theme (the auth panel, the admin
 * sidebar) via `onDark`.
 *
 * `priority` is accepted for call-site compatibility (it was a next/image hint)
 * and is now a no-op — the mark renders as inline SVG.
 */
export function BrandMark({
  size = 40,
  className,
  onDark = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  onDark?: boolean;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={STORE.name}
    >
      <svg
        viewBox="0 0 40 40"
        width={Math.round(size * 0.9)}
        height={Math.round(size * 0.9)}
        fill="none"
        className={onDark ? "text-white" : "text-primary"}
        aria-hidden
      >
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="4" />
        <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="4" />
        <circle cx="20" cy="20" r="3" fill="currentColor" />
        <path d="M20 3v7M20 30v7M3 20h7M30 20h7M8 8l5 5m14 14 5 5M32 8l-5 5M13 27l-5 5" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}
