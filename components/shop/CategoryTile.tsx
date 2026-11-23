import Link from "next/link";
import { CATEGORY_ICONS } from "@/lib/home-content";
import { cn } from "@/lib/utils";

type CategoryTileProps = {
  slug: string;
  name: string;
  count: number;
  /** "sm" = home rail chip; "lg" = category index tile. */
  size?: "sm" | "lg";
};

/** Category tile shared by the home rail and the /c index grid. */
export function CategoryTile({ slug, name, count, size = "sm" }: CategoryTileProps) {
  const lg = size === "lg";
  return (
    <Link
      href={`/c/${slug}`}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card text-center transition-colors hover:border-primary/40 hover:bg-primary/5",
        lg ? "p-5" : "w-24 shrink-0 p-3",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-background",
          lg ? "size-16 text-4xl" : "size-12 text-2xl",
        )}
      >
        {CATEGORY_ICONS[slug] ?? "🛞"}
      </span>
      <span className={cn("font-bold leading-tight text-foreground", lg ? "text-sm" : "text-xs")}>
        {name}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{count} items</span>
    </Link>
  );
}
