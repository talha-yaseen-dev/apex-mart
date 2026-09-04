import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/storefront";
import { CATEGORY_META, categoryMeta } from "@/lib/category-meta";
import { CategoryListing } from "@/components/shop/CategoryListing";

/**
 * Subcategory listing — same components, same facets as the parent category
 * page, scoped to the child aisle.
 *
 * NOTE: the current grocery catalogue is flat (6 top-level aisles, no children),
 * and /api/v1/* exposes no category tree, so `sub` is validated against the flat
 * category list. With the present data these URLs 404; the page renders the
 * correct parent→child hierarchy once subcategories are seeded.
 */

type PageProps = {
  params: Promise<{ category: string; sub: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, sub } = await params;
  const meta = CATEGORY_META[sub];
  const title = meta?.title ?? sub;
  return {
    title,
    description: meta?.description ?? `Shop ${title} at Apex Mart.`,
    alternates: { canonical: `/c/${category}/${sub}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: PageProps) {
  const { category, sub } = await params;
  const sp = await searchParams;

  const categories = await getCategories();
  const parent = categories.find((c) => c.slug === category);
  const child = categories.find((c) => c.slug === sub);
  if (!parent || !child) notFound();

  const meta = categoryMeta(sub, child.name);

  return (
    <CategoryListing
      slug={sub}
      title={child.name}
      tagline={meta.tagline}
      basePath={`/c/${category}/${sub}`}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Categories", href: "/c" },
        { label: parent.name, href: `/c/${category}` },
        { label: child.name },
      ]}
      searchParams={sp}
    />
  );
}
