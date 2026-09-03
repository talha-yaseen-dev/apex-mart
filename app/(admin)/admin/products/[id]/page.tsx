import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/admin";
import { can } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { ProductStatusSelect } from "@/components/admin/product-status-select";
import { ProductDetailsEditor } from "@/components/admin/product-details-editor";
import { VariantEditor } from "@/components/admin/variant-editor";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [p, canPublish, canEditPricing] = await Promise.all([
    getAdminProduct((await params).id),
    can(PERMISSIONS.CATALOG_PUBLISH),
    can(PERMISSIONS.CATALOG_PRICING),
  ]);
  if (!p) notFound();

  return (
    <div className="animate-fade max-w-3xl">
      <Link href="/admin/products" className="text-[13px] font-semibold text-primary-hover">
        ← All products
      </Link>
      <div className="mb-1.5 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{p.name}</h1>
        <ProductStatusSelect productId={p.id} status={p.status} canEdit={canPublish} />
      </div>
      <div className="mb-5 font-mono text-[12.5px] text-muted-foreground">/{p.slug}</div>

      <div className="grid gap-5">
        <ProductDetailsEditor
          product={{
            id: p.id,
            name: p.name,
            brand: p.brand,
            categoryId: p.categoryId,
            categories: p.categories,
            images: p.images,
          }}
        />

        <div>
          <VariantEditor variants={p.variants} canEdit={canEditPricing} />
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            {canEditPricing
              ? "Price and stock edits are written straight to the variant and recorded in the audit log. Larger stock changes should go through "
              : "Pricing is managed by a manager or admin. You can still adjust stock through "}
            <Link href="/admin/inventory" className="font-semibold text-primary-hover">
              Inventory
            </Link>{" "}
            so they leave an InventoryLog entry with a reason.
          </p>
        </div>
      </div>
    </div>
  );
}
