import type { Metadata } from "next";
import Link from "next/link";
import { Package, Heart, MapPin, ChevronRight, Truck, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getAccountCounts, getAddresses, getUserOrders } from "@/lib/account";
import { formatPKR, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const [counts, addresses, orders] = await Promise.all([
    getAccountCounts(user.id),
    getAddresses(user.id),
    getUserOrders(user.id),
  ]);
  const recent = orders.slice(0, 3);
  const firstName = (user.name ?? "").trim().split(" ")[0] || "there";

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
        Hi {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back to your account.</p>

      {/* Quick stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard icon={Package} label="Orders" value={counts.orders} href="/account/orders" />
        <StatCard icon={Heart} label="Wishlist" value={counts.wishlist} href="/account/wishlist" />
        <StatCard icon={MapPin} label="Addresses" value={addresses.length} href="/account/addresses" />
      </div>

      {/* Recent orders */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-extrabold text-foreground">Recent orders</h2>
          {recent.length > 0 && (
            <Link href="/account/orders" className="text-sm font-bold text-primary hover:underline">
              View all →
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <div className="mb-2 text-3xl">📦</div>
            <p className="text-sm font-extrabold text-foreground">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your orders will show up here once you place one.
            </p>
            <Link
              href="/"
              className="tap-target mt-4 inline-flex items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-foreground">{o.number}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(o.date)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-foreground">
                    {formatPKR(o.totalMinor)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-extrabold text-foreground">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            icon={Truck}
            title="Track an order"
            subtitle="Follow a delivery in real time"
            href="/track"
          />
          <ActionCard
            icon={ShoppingBag}
            title="Continue shopping"
            subtitle="Back to the aisles"
            href="/"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <Icon className="size-5 text-primary" aria-hidden />
      <span className="text-2xl font-extrabold text-foreground">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </Link>
  );
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  href,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
