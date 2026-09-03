import { getReports } from "@/lib/admin";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { StatusBadge } from "@/components/account/status-badge";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  // Revenue/financial reporting is manager/admin only — not routine staff.
  await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const r = await getReports();
  const stats = [
    { label: "Net revenue", value: formatMoney(r.revenueMinor) },
    { label: "Paid orders", value: String(r.orders) },
    { label: "Avg order value", value: formatMoney(r.aovMinor) },
    { label: "Tax collected", value: formatMoney(r.taxMinor) },
    { label: "Shipping", value: formatMoney(r.shippingMinor) },
    { label: "Discounts", value: `−${formatMoney(r.discountMinor)}` },
  ];

  return (
    <div className="animate-fade">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight">Reports</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3 text-sm font-bold">Orders by status</div>
          {r.byStatus.map((s) => (
            <div key={s.status} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
              <StatusBadge status={s.status} />
              <span className="ml-auto font-semibold tabular-nums">{s.count}</span>
            </div>
          ))}
          {r.byStatus.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No data.</div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3 text-sm font-bold">Top products (units)</div>
          {r.topProducts.map((t) => (
            <div key={t.name} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
              <span className="truncate text-[13px]">{t.name}</span>
              <span className="ml-auto font-semibold tabular-nums">{t.qty}</span>
            </div>
          ))}
          {r.topProducts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No sales yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
