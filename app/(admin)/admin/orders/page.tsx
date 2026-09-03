import Link from "next/link";
import { getAdminOrders } from "@/lib/admin";
import { StatusBadge } from "@/components/account/status-badge";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "PENDING", "PAID", "FULFILLED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? "ALL";
  const query = sp.q ?? "";
  const orders = await getAdminOrders(filter, query);
  const filterHref = (f: string) => {
    const p = new URLSearchParams();
    if (f !== "ALL") p.set("filter", f);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <div className="animate-fade">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Orders</h1>
        <form className="ml-auto">
          {filter !== "ALL" && <input type="hidden" name="filter" value={filter} />}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search order # or customer…"
            aria-label="Search orders"
            className="h-9 w-64 rounded-lg border bg-card px-3 text-sm focus:border-primary focus:outline-none"
          />
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={filterHref(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              filter === f
                ? "bg-primary text-white"
                : "border bg-card text-foreground/70 hover:border-primary",
            )}
          >
            {f === "ALL" ? "All" : f}
          </Link>
        ))}
      </div>

      {/* Mobile: stacked cards so each order reads cleanly on a phone. */}
      <div className="space-y-2.5 sm:hidden">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="block rounded-xl border bg-card p-3.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary-hover">{o.number}</span>
              <div className="ml-auto">
                <StatusBadge status={o.status} />
              </div>
            </div>
            <div className="mt-1 text-[13px] font-medium">{o.customer}</div>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Date</dt>
                <dd className="font-medium">
                  {o.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Items</dt>
                <dd className="font-medium tabular-nums">{o.itemCount}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Total</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(o.totalMinor)}</dd>
              </div>
            </dl>
          </Link>
        ))}
        {orders.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            No orders in this view.
          </div>
        )}
      </div>

      {/* Desktop: table with horizontal scroll fallback for narrow tablets. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 font-semibold">Customer</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Items</th>
              <th className="px-4 py-2.5 font-semibold">Total</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-primary-hover">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {o.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3 tabular-nums">{o.itemCount}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(o.totalMinor)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No orders in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
