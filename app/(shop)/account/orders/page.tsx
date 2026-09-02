import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getUserOrders } from "@/lib/account";
import { formatPKR, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const orders = await getUserOrders(user.id);

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Your orders</h1>
        {orders.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-2 text-4xl">📦</div>
          <p className="text-sm font-extrabold text-foreground">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you place an order it&apos;ll appear here.
          </p>
          <Link
            href="/"
            className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 sm:p-4"
              >
                {/* Product thumbnails */}
                <div className="flex shrink-0 -space-x-3">
                  {o.thumbs.map((t, i) => (
                    <span
                      key={i}
                      className="size-12 overflow-hidden rounded-xl border-2 border-card bg-muted"
                    >
                      {t.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.image} alt={t.label} className="size-full object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-lg">
                          🛒
                        </span>
                      )}
                    </span>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{o.number}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatDate(o.date)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.summary}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm font-extrabold text-foreground">
                    {formatPKR(o.totalMinor)}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
