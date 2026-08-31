import Link from "next/link";
import type { StoreCard } from "@/lib/catalog-filter";
import { ProductCard } from "./ProductCard";

export type SectionItem = {
  card: StoreCard;
  originalMinor?: number | null;
  isNew?: boolean;
};

type ProductSectionProps = {
  title: string;
  note?: string;
  seeAllHref?: string;
  items: SectionItem[];
};

/** A titled product grid (Popular / On sale / Just arrived, and category grids). */
export function ProductSection({ title, note, seeAllHref, items }: ProductSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="pt-6">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h2>
        {note && <span className="text-xs font-semibold text-muted-foreground">{note}</span>}
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="ml-auto text-xs font-bold text-primary hover:underline"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map(({ card, originalMinor, isNew }) => (
          <ProductCard
            key={card.slug}
            card={card}
            originalMinor={originalMinor}
            isNew={isNew}
          />
        ))}
      </div>
    </section>
  );
}
