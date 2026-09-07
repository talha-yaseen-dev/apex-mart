import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getCategoryProducts } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { isWishlisted, withWishlistState } from "@/lib/account";
import { saleOriginalMinor } from "@/lib/home-content";
import { DELIVERY_ESTIMATE } from "@/lib/delivery-config";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { ProductSection, type SectionItem } from "@/components/shop/ProductSection";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };

  const packs = p.variants.map((v) => v.attrs.packSize ?? v.attrs.pack).filter(Boolean).join(", ");
  const description = `${p.brand ? `${p.brand} ` : ""}${p.name}${
    packs ? ` — available in ${packs}` : ""
  }. PKR prices, cash on delivery at Apex Mart.`;

  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: p.name,
      description,
      type: "website",
      images: p.images[0] ? [{ url: p.images[0].url }] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const prices = p.variants.map((v) => v.priceMinor);
  const anyInStock = p.variants.some((v) => v.stock > 0);

  const user = await getCurrentUser();
  const savedInitial = user ? await isWishlisted(user.id, p.id) : false;

  // Similar products from the same aisle (reuse ProductCard via ProductSection).
  const related = await getCategoryProducts(p.categorySlug, {});
  const relatedItems = await withWishlistState(user?.id, related.items);
  const similar: SectionItem[] = relatedItems
    .filter((c) => c.slug !== p.slug)
    .slice(0, 6)
    .map((card) => ({ card, originalMinor: saleOriginalMinor(card.slug) }));

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.url),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    category: p.categoryName,
    ...(p.variants[0]?.sku ? { sku: p.variants[0].sku } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: Math.min(...prices) / 100,
      highPrice: Math.max(...prices) / 100,
      offerCount: p.variants.length,
      availability: anyInStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 md:pb-0">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/c" },
          { label: p.categoryName, href: `/c/${p.categorySlug}` },
          { label: p.name },
        ]}
      />

      <div className="mt-4">
        <ProductDetail
          name={p.name}
          brand={p.brand}
          categoryName={p.categoryName}
          categorySlug={p.categorySlug}
          images={p.images}
          variants={p.variants}
          productId={p.id}
          savedInitial={savedInitial}
          deliveryEstimate={DELIVERY_ESTIMATE}
        />
      </div>

      {similar.length > 0 && (
        <ProductSection title={`More in ${p.categoryName}`} items={similar} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
    </div>
  );
}
