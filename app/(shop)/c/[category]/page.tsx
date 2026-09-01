import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/storefront";
import { CATEGORY_META, categoryMeta } from "@/lib/category-meta";
import { CategoryListing } from "@/components/shop/CategoryListing";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORY_META[category];
  if (!meta) return { title: "Category" };
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/c/${category}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const sp = await searchParams;

  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const meta = categoryMeta(category, cat.name);

  return (
    <CategoryListing
      slug={category}
      title={cat.name}
      tagline={meta.tagline}
      basePath={`/c/${category}`}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Categories", href: "/c" },
        { label: cat.name },
      ]}
      searchParams={sp}
    />
  );
}
