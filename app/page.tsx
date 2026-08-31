import { getAllCatalog } from "@/lib/storefront";
import { HomeHero } from "@/components/shop/HomeHero";
import { CategoryRail } from "@/components/shop/CategoryRail";
import { ProductSection, type SectionItem } from "@/components/shop/ProductSection";
import {
  CATEGORY_ICONS,
  POPULAR_SLUGS,
  SALE,
  JUST_ARRIVED_LIMIT,
  TRUST_POINTS,
} from "@/lib/home-content";

const saleMinor = (slug: string): number | null =>
  SALE[slug] != null ? SALE[slug] * 100 : null;

export default async function HomePage() {
  const { items, facets } = await getAllCatalog();
  const bySlug = new Map(items.map((i) => [i.slug, i]));

  const order = Object.keys(CATEGORY_ICONS);
  const categories = [...facets.categories].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug),
  );

  const popular: SectionItem[] = POPULAR_SLUGS.map((s) => bySlug.get(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((card) => ({ card, originalMinor: saleMinor(card.slug) }));

  const onSale: SectionItem[] = items
    .filter((i) => SALE[i.slug] != null)
    .map((card) => ({ card, originalMinor: saleMinor(card.slug) }));

  const justArrived: SectionItem[] = [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, JUST_ARRIVED_LIMIT)
    .map((card) => ({ card, isNew: true, originalMinor: saleMinor(card.slug) }));

  return (
    <div className="mx-auto max-w-7xl px-4">
      <HomeHero />
      <CategoryRail categories={categories} />

      <div id="shop" className="scroll-mt-28">
        <ProductSection
          title="Popular this week"
          note="What the neighbourhood keeps reordering"
          items={popular}
        />
        <ProductSection
          title="On sale now"
          note={`${onSale.length} items marked down`}
          items={onSale}
        />
        <ProductSection
          title="Just arrived"
          note="Fresh on the shelves"
          items={justArrived}
        />
      </div>

      <section className="mt-8 grid grid-cols-1 gap-5 rounded-3xl border border-border bg-muted/40 p-6 sm:grid-cols-3">
        {TRUST_POINTS.map((t) => (
          <div key={t.title} className="flex gap-3">
            <span className="text-xl">{t.icon}</span>
            <div>
              <p className="text-sm font-extrabold text-foreground">{t.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {t.body}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
