import Link from "next/link";
import { getAdminProducts, getCategories } from "@/lib/admin";
import { can } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";
import { isDemoAccount } from "@/lib/auth-constants";
import { PERMISSIONS } from "@/lib/permissions";
import { ProductStatusSelect } from "@/components/admin/product-status-select";
import { NewProductForm } from "@/components/admin/new-product-form";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const [products, categories, canArchive, canDelete, canPublish, user] = await Promise.all([
    getAdminProducts(query),
    getCategories(),
    can(PERMISSIONS.CATALOG_ARCHIVE),
    can(PERMISSIONS.CATALOG_DELETE),
    can(PERMISSIONS.CATALOG_PUBLISH),
    getCurrentUser(),
  ]);
  // Permanent (irreversible) delete is hidden for the shared demo accounts;
  // archiving stays available to anyone with catalog:archive.
  const canPermanentDelete = canDelete && !isDemoAccount(user?.email);
  // Whether to render the removal column at all (archive and/or permanent delete).
  const canRemove = canArchive || canPermanentDelete;

  return (
    <div className="animate-fade">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Products</h1>
        <div className="ml-auto flex items-center gap-3">
          <form>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search products…"
              className="h-9 w-56 rounded-lg border bg-card px-3 text-sm focus:border-primary focus:outline-none"
            />
          </form>
          <NewProductForm categories={categories} />
        </div>
      </div>

      {/* Mobile: stacked cards. */}
      <div className="space-y-2.5 sm:hidden">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-3">
            <div className="flex gap-3">
              <Thumb src={p.image} name={p.name} count={p.imageCount} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="line-clamp-2 font-semibold leading-snug hover:text-primary-hover"
                  >
                    {p.name}
                  </Link>
                  {p.archived && <ArchivedBadge />}
                </div>
                <div className="mt-0.5 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  {p.category}
                </div>
                <div className="mt-1.5 text-[13px] font-bold tabular-nums">
                  {p.loMinor === p.hiMinor
                    ? formatMoney(p.loMinor)
                    : `${formatMoney(p.loMinor)}–${formatMoney(p.hiMinor)}`}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 border-t pt-2.5 text-[12px] text-muted-foreground">
              <span>
                {p.variantCount} {p.variantCount === 1 ? "variant" : "variants"}
              </span>
              <span aria-hidden>·</span>
              <span className={p.stock < 10 ? "font-bold text-warning" : "tabular-nums"}>
                {p.stock} in stock
              </span>
              <div className="ml-auto flex items-center gap-3">
                <ProductStatusSelect productId={p.id} status={p.status} canEdit={canPublish} />
                {canRemove && (
                  <ProductRowActions
                    id={p.id}
                    name={p.name}
                    archived={p.archived}
                    canArchive={canArchive}
                    canPermanentDelete={canPermanentDelete}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            No products found.
          </div>
        )}
      </div>

      {/* Desktop: table. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Product</th>
              <th className="px-4 py-2.5 font-semibold">Variants</th>
              <th className="px-4 py-2.5 font-semibold">Stock</th>
              <th className="px-4 py-2.5 font-semibold">Price</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb src={p.image} name={p.name} count={p.imageCount} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-semibold hover:text-primary-hover"
                        >
                          {p.name}
                        </Link>
                        {p.archived && <ArchivedBadge />}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{p.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{p.variantCount}</td>
                <td className="px-4 py-3">
                  <span className={p.stock < 10 ? "font-bold text-warning" : "tabular-nums"}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.loMinor === p.hiMinor
                    ? formatMoney(p.loMinor)
                    : `${formatMoney(p.loMinor)}–${formatMoney(p.hiMinor)}`}
                </td>
                <td className="px-4 py-3">
                  <ProductStatusSelect productId={p.id} status={p.status} canEdit={canPublish} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold text-primary-hover">
                      Edit
                    </Link>
                    {canRemove && (
                  <ProductRowActions
                    id={p.id}
                    name={p.name}
                    archived={p.archived}
                    canArchive={canArchive}
                    canPermanentDelete={canPermanentDelete}
                  />
                )}
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArchivedBadge() {
  return (
    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      Archived
    </span>
  );
}

/** Small product thumbnail with an image-count badge; falls back to a placeholder. */
function Thumb({ src, name, count }: { src: string | null; name: string; count: number }) {
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-[10px] text-muted-foreground">
          No image
        </div>
      )}
      {count > 1 && (
        <span className="absolute bottom-0 right-0 rounded-tl-md bg-foreground/75 px-1 text-[9px] font-bold text-background">
          {count}
        </span>
      )}
    </div>
  );
}
