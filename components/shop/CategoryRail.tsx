import Link from "next/link";
import { CATEGORY_ICONS } from "@/lib/home-content";

type Category = { slug: string; name: string; count: number };

/**
 * Thumb-scrollable rail of category tiles linking to /c/[slug]. The section id
 * is the target of the bottom nav's "Categories" tab (a dedicated /c index
 * lands with page 3).
 */
export function CategoryRail({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section id="categories" className="scroll-mt-28 pt-6">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Shop by aisle</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {categories.length} categories
        </span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/c/${c.slug}`}
            className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-2xl transition-colors group-hover:bg-background">
              {CATEGORY_ICONS[c.slug] ?? "🛒"}
            </span>
            <span className="text-xs font-bold leading-tight text-foreground">{c.name}</span>
            <span className="text-[11px] font-medium text-muted-foreground">{c.count} items</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
