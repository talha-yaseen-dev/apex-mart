import { getCustomers } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { AccountActiveToggle } from "@/components/admin/account-active-toggle";
import { DeleteAllCustomersButton } from "@/components/admin/delete-all-customers-button";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  // Customer records are PII — managers/admins only (customers:view).
  const viewer = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const [customers, self] = await Promise.all([
    getCustomers(),
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: { isPrimaryAdmin: true },
    }),
  ]);
  const isPrimary = Boolean(self?.isPrimaryAdmin);
  const cols = isPrimary ? 5 : 4;

  return (
    <div className="animate-fade">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
        {isPrimary && customers.length > 0 && (
          <DeleteAllCustomersButton count={customers.length} />
        )}
      </div>
      {/* Mobile: stacked cards so every field fits on a phone screen. */}
      <div className="space-y-2.5 sm:hidden">
        {customers.map((c) => (
          <div key={c.id} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  {c.deactivated && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                      deactivated
                    </span>
                  )}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">{c.email}</div>
              </div>
              {isPrimary && (
                <div className="ml-auto shrink-0">
                  <AccountActiveToggle userId={c.id} deactivated={c.deactivated} />
                </div>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Orders</dt>
                <dd className="font-medium tabular-nums">{c.orders}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Lifetime</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(c.ltvMinor)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Joined</dt>
                <dd className="font-medium">
                  {c.joined.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            No customers yet.
          </div>
        )}
      </div>

      {/* Desktop: table with horizontal scroll fallback for narrow tablets. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="px-4 py-2.5 font-semibold">Orders</th>
              <th className="px-4 py-2.5 font-semibold">Lifetime value</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              {isPrimary && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.deactivated && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                        deactivated
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{c.email}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{c.orders}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(c.ltvMinor)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.joined.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </td>
                {isPrimary && (
                  <td className="px-4 py-3 text-right">
                    <AccountActiveToggle userId={c.id} deactivated={c.deactivated} />
                  </td>
                )}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={cols} className="px-4 py-10 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
