import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getCategoryProducts } from "@/lib/storefront";
import { getCurrentUser } from "@/lib/session";
import { isWishlisted, withWishlistState } from "@/lib/account";
import { saleOriginalMinor } from "@/lib/home-content";
import { DELIVERY_ESTIMATE } from "@/lib/delivery-config";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductPurchase } from "@/components/shop/ProductPurchase";
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
  }. PKR prices, cash on delivery at Mart Shop.`;

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
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 md:pb-0">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/c" },
          { label: p.categoryName, href: `/c/${p.categorySlug}` },
          { label: p.name },
        ]}
      />

      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        {/* Gallery — edge-to-edge on mobile */}
        <div className="-mx-4 sm:mx-0">
          <ProductGallery images={p.images} name={p.name} />
        </div>

        {/* Info column */}
        <div className="flex flex-col gap-5">
          <div>
            {p.brand && (
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {p.brand}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              {p.name}
            </h1>
            <Link
              href={`/c/${p.categorySlug}`}
              className="mt-1 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {p.categoryName}
            </Link>
            {/* Rating summary only if the API returns reviews (none for grocery). */}
            {p.reviewCount > 0 && (
              <p className="mt-1 text-sm font-semibold text-foreground">
                ★ {p.rating.toFixed(1)}{" "}
                <span className="font-normal text-muted-foreground">
                  ({p.reviewCount} reviews)
                </span>
              </p>
            )}
          </div>

          <ProductPurchase
            variants={p.variants}
            saleOriginalMinor={saleOriginalMinor(p.slug)}
            deliveryEstimate={DELIVERY_ESTIMATE}
            productId={p.id}
            savedInitial={savedInitial}
          />

          {/* Product details — real facts only (no invented description/nutrition). */}
          <div className="rounded-2xl border border-border p-4">
            <h2 className="mb-3 text-sm font-extrabold text-foreground">Product details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {p.brand && (
                <>
                  <dt className="font-semibold text-muted-foreground">Brand</dt>
                  <dd className="text-foreground">{p.brand}</dd>
                </>
              )}
              <dt className="font-semibold text-muted-foreground">Category</dt>
              <dd className="text-foreground">{p.categoryName}</dd>
              <dt className="font-semibold text-muted-foreground">Pack sizes</dt>
              <dd className="text-foreground">
                {p.variants.map((v) => v.attrs.packSize ?? v.attrs.pack).filter(Boolean).join(", ")}
              </dd>
            </dl>
          </div>
        </div>
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
