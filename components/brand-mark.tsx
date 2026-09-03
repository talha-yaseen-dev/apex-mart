import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nova brand mark — ported from the mobile app's logo: a sparkle glyph in the
 * brand colour. In the app chrome the wordmark "Nova" sits beside it (headers,
 * footer, auth panel), exactly as in the mobile `Logo` component.
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
      aria-label="Nova"
    >
      <Sparkles
        size={Math.round(size * 0.82)}
        fill="currentColor"
        strokeWidth={1.25}
        className={onDark ? "text-white" : "text-primary"}
        aria-hidden
      />
    </span>
  );
}
