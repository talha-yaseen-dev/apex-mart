import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Clock, Phone, Download } from "lucide-react";
import { fetchOrder } from "@/lib/order-access";
import { readOrderEmailCookie } from "@/lib/order-cookie";
import { formatPKR } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { CopyRef } from "@/components/order/CopyRef";
import { SignupUpsell } from "@/components/order/SignupUpsell";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ phone?: string }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const { ref } = await params;
  const { phone } = await searchParams;

  const order = await fetchOrder(ref, phone ?? null);
  if (!order) notFound();

  // Real email captured at checkout (if any), to pre-fill the signup upsell.
  const presetEmail = order.isGuest ? await readOrderEmailCookie(order.orderNumber) : null;

  const isCod = (order.paymentProvider ?? "cod") === "cod";
  const trackHref = `/track?ref=${encodeURIComponent(order.orderNumber)}${
    order.customerPhone ? `&phone=${encodeURIComponent(order.customerPhone)}` : ""
  }`;
  const invoiceHref = `/order/${order.orderNumber}/invoice${
    order.customerPhone ? `?phone=${encodeURIComponent(order.customerPhone)}` : ""
  }`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28 md:pb-10">
      {/* 1 — Success header */}
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="size-16 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
          Order confirmed
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks{order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}! We&apos;re
          getting your order ready.
        </p>
        <div className="mt-4">
          <CopyRef value={order.orderNumber} />
        </div>
      </div>

      {/* 2 — Amount due (COD emphasis) */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
          {isCod ? "Amount due on delivery" : "Amount paid"}
        </p>
        <p className="mt-1 text-4xl font-extrabold text-foreground">
          {formatPKR(order.totalMinor)}
        </p>
        {isCod && (
          <p className="mt-1 text-sm text-muted-foreground">💵 Pay in cash to the rider on delivery</p>
        )}
      </div>

      {/* 3 — Delivery details */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-foreground">Delivery details</h2>
        <div className="space-y-3 text-sm">
          {order.slot && (
            <div className="flex gap-3">
              <Clock className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{order.slot}</span>
            </div>
          )}
          {order.address && (
            <div className="flex gap-3">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">
                {order.address.line1}
                {order.address.extras ? `, ${order.address.extras}` : ""}, {order.address.city}
                <span className="block text-muted-foreground">{order.address.region}</span>
              </span>
            </div>
          )}
          {order.customerPhone && (
            <div className="flex gap-3">
              <Phone className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{maskPhone(order.customerPhone)}</span>
            </div>
          )}
        </div>
      </section>

      {/* 4 — Items */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-foreground">
          Order items ({order.items.length})
        </h2>
        <ul className="space-y-3">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-3">
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
                  {it.pack ? `${it.pack} · ` : ""}
                  {it.qty} × {formatPKR(it.unitPriceMinor)}
                </p>
              </div>
              <div className="shrink-0 text-sm font-extrabold text-foreground">
                {formatPKR(it.lineTotalMinor)}
              </div>
            </li>
          ))}
        </ul>

        {/* 5 — Totals */}
        <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-semibold text-foreground">{formatPKR(order.subtotalMinor)}</dd>
          </div>
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
          <div className="mt-2 flex justify-between border-t border-border pt-3">
            <dt className="text-base font-extrabold text-foreground">Total</dt>
            <dd className="text-base font-extrabold text-foreground">
              {formatPKR(order.totalMinor)}
            </dd>
          </div>
        </dl>
      </section>

      {/* 7 — Signup upsell (guest only) */}
      {order.isGuest && (
        <div className="mt-6">
          <SignupUpsell orderRef={order.orderNumber} presetEmail={presetEmail} />
        </div>
      )}

      {/* 6 + 8 — Track + Download invoice (desktop inline) */}
      <div className="mt-6 hidden gap-3 md:flex">
        <Link
          href={trackHref}
          className="tap-target inline-flex flex-1 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
        >
          Track order
        </Link>
        <Link
          href={invoiceHref}
          className="tap-target inline-flex items-center justify-center gap-2 rounded-xl border border-input px-5 text-sm font-bold text-foreground hover:bg-muted"
        >
          <Download className="size-4" aria-hidden /> Download invoice
        </Link>
      </div>

      {/* Download invoice on mobile (Track is the sticky bar below) */}
      <Link
        href={invoiceHref}
        className="tap-target mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-input text-sm font-bold text-foreground hover:bg-muted md:hidden"
      >
        <Download className="size-4" aria-hidden /> Download invoice
      </Link>

      {/* Sticky mobile Track CTA */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <Link
          href={trackHref}
          className="tap-target mx-auto flex max-w-2xl items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
        >
          Track order
        </Link>
      </div>
    </div>
  );
}
