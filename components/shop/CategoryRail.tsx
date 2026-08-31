import { CategoryTile } from "./CategoryTile";

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
          <CategoryTile key={c.slug} slug={c.slug} name={c.name} count={c.count} size="sm" />
        ))}
      </div>
    </section>
  );
}
