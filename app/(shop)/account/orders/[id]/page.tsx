import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Check, CircleAlert, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getOrderForUser } from "@/lib/account";
import { formatPKR, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { CopyRef } from "@/components/order/CopyRef";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order detail",
  robots: { index: false, follow: false },
};

/** provider → customer-facing method label (COD-only store today). */
const PAYMENT_METHOD: Record<string, string> = {
  cod: "Cash on delivery",
  stripe: "Card",
};

/** PaymentStatus → friendly label + tone. */
const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  PROCESSING: { label: "Processing", className: "border-blue-200 bg-blue-50 text-blue-700" },
  SUCCEEDED: { label: "Confirmed", className: "border-primary/20 bg-primary/10 text-primary" },
  FAILED: { label: "Failed", className: "border-red-200 bg-red-50 text-red-700" },
  REFUNDED: { label: "Refunded", className: "border-border bg-muted text-muted-foreground" },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null; // layout already guards; satisfies types

  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const isTerminated =
    order.status === "CANCELLED" || order.status === "REFUNDED";
  const method = PAYMENT_METHOD[order.payment.provider] ?? order.payment.provider;
  const payStatus = order.payment.status ? PAYMENT_STATUS[order.payment.status] : null;
  const trackHref = `/track?ref=${encodeURIComponent(order.number)}${
    order.customerPhone ? `&phone=${encodeURIComponent(order.customerPhone)}` : ""
  }`;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link
        href="/account/orders"
        className="tap-target -ml-1 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        All orders
      </Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{order.number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {formatDate(order.placedDate)}
      </p>
      <div className="mt-3">
        <CopyRef value={order.number} />
      </div>

      {/* Status */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-extrabold text-foreground">Status</h2>
        {isTerminated ? (
          <div className="flex items-start gap-3 text-sm">
            <CircleAlert className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-foreground">
              This order was {order.status === "REFUNDED" ? "refunded" : "cancelled"}. If you have a
              question about it,{" "}
              <Link href={`/account/orders/${order.id}/return`} className="font-bold text-primary hover:underline">
                report a problem
              </Link>
              .
            </p>
          </div>
        ) : (
          <ol className="relative space-y-5">
            {order.shipment.steps.map((s, i) => {
              const last = i === order.shipment.steps.length - 1;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                        s.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {s.done ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                    {!last && (
                      <span
                        className={cn("mt-1 w-0.5 flex-1", s.done ? "bg-primary" : "bg-border")}
                        style={{ minHeight: "1.25rem" }}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="pb-0.5">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        s.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </p>
                    {s.when && (
                      <p className="text-xs text-muted-foreground">{formatDate(s.when)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Items */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-foreground">
          Items ({order.items.length})
        </h2>
        <ul className="space-y-3">
          {order.items.map((it) => {
            const inner = (
              <>
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xl">🛒</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.variantLabel ? `${it.variantLabel} · ` : ""}
                    {it.qty} × {formatPKR(it.unitMinor)}
                  </p>
                </div>
                <div className="shrink-0 text-sm font-extrabold text-foreground">
                  {formatPKR(it.lineTotalMinor)}
                </div>
              </>
            );
            return (
              <li key={it.id}>
                {it.productSlug ? (
                  <Link
                    href={`/products/${it.productSlug}`}
                    className="flex gap-3 rounded-xl transition-colors hover:bg-primary/5"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex gap-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Totals */}
        <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-semibold text-foreground">{formatPKR(order.subtotalMinor)}</dd>
          </div>
          {order.discountMinor > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="font-semibold text-primary">−{formatPKR(order.discountMinor)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="font-semibold text-foreground">
              {order.shippingMinor === 0 ? (
                <span className="text-primary">Free</span>
              ) : (
                formatPKR(order.shippingMinor)
              )}
            </dd>
          </div>
          {order.taxMinor > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="font-semibold text-foreground">{formatPKR(order.taxMinor)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-3">
            <dt className="text-base font-extrabold text-foreground">Total</dt>
            <dd className="text-base font-extrabold text-foreground">
              {formatPKR(order.totalMinor)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Payment */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-foreground">Payment</h2>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{method}</p>
            {order.payment.provider === "cod" && (
              <p className="text-xs text-muted-foreground">Pay cash to the rider on delivery</p>
            )}
          </div>
          {payStatus && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
                payStatus.className,
              )}
            >
              {payStatus.label}
            </span>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/account/orders/${order.id}/return`}
          className="tap-target inline-flex flex-1 items-center justify-center rounded-xl border border-input px-5 text-sm font-bold text-foreground hover:bg-muted"
        >
          Report a problem
        </Link>
        <Link
          href={trackHref}
          className="tap-target inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
        >
          Track order
        </Link>
      </div>
    </div>
  );
}
