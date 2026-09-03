import Link from "next/link";
import { getDashboard } from "@/lib/admin";
import { can } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { StatusBadge } from "@/components/account/status-badge";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Company revenue is for managers and admins (reports:view): routine staff see
  // the dashboard's operational KPIs but not the financial top line.
  const [d, canSeeRevenue] = await Promise.all([getDashboard(), can(PERMISSIONS.REPORTS_VIEW)]);
  const kpis = [
    ...(canSeeRevenue
      ? [{ label: "Revenue", value: formatMoney(d.revenueMinor), tone: "text-primary" }]
      : []),
    { label: "Orders", value: String(d.orderCount) },
    { label: "Pending", value: String(d.pendingCount), tone: "text-warning" },
    { label: "Low stock", value: String(d.lowStockCount), tone: "text-destructive" },
  ];

  return (
    <div className="animate-fade">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight">Dashboard</h1>

      <div
        className={cn(
          "mb-6 grid grid-cols-2 gap-4",
          canSeeRevenue ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <div className="text-[12px] text-muted-foreground">{k.label}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${k.tone ?? ""}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center border-b px-4 py-3">
            <span className="text-sm font-bold">Recent orders</span>
            <Link href="/admin/orders" className="ml-auto text-[12.5px] font-semibold text-primary-hover">
              View all →
            </Link>
          </div>
          {d.recent.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50"
            >
              <span className="font-mono text-[13px] font-semibold">{o.number}</span>
              <StatusBadge status={o.status} />
              <span className="hidden text-[12.5px] text-muted-foreground sm:inline">
                {o.customer}
              </span>
              <span className="ml-auto text-sm font-bold">{formatMoney(o.totalMinor)}</span>
            </Link>
          ))}
          {d.recent.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No orders yet.</div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center border-b px-4 py-3">
            <span className="text-sm font-bold">Low stock</span>
            <Link href="/admin/inventory" className="ml-auto text-[12.5px] font-semibold text-primary-hover">
              Manage →
            </Link>
          </div>
          {d.lowStock.map((v) => (
            <div key={v.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{v.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{v.sku}</div>
              </div>
              <span
                className={`text-sm font-bold ${v.stock === 0 ? "text-destructive" : "text-warning"}`}
              >
                {v.stock}
              </span>
            </div>
          ))}
          {d.lowStock.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">All stocked up.</div>
          )}
        </section>
      </div>
    </div>
  );
}
