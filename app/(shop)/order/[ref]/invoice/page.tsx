import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchOrder } from "@/lib/order-access";
import { formatPKR } from "@/lib/format";
import { STORE } from "@/lib/delivery-config";
import { InvoiceActions } from "@/components/order/InvoiceActions";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ phone?: string }>;
};

export default async function InvoicePage({ params, searchParams }: PageProps) {
  const { ref } = await params;
  const { phone } = await searchParams;

  // Same access guard as the order page: the ref cookie (set at checkout) or a
  // matching phone. No leak — an unauthorised ref 404s.
  const order = await fetchOrder(ref, phone ?? null);
  if (!order) notFound();

  const date = new Date(order.placedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const backHref = `/order/${order.orderNumber}${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <InvoiceActions backHref={backHref} />

      <div className="rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="text-lg font-extrabold">{STORE.name}</div>
            <div className="text-xs text-muted-foreground">
              {STORE.city}
              {STORE.region ? `, ${STORE.region}` : ""}
            </div>
            {STORE.whatsapp && (
              <div className="text-xs text-muted-foreground">WhatsApp: {STORE.whatsapp}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold tracking-tight">INVOICE</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">{order.orderNumber}</div>
            <div className="text-xs text-muted-foreground">{date}</div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Billed to
            </div>
            <div className="mt-1 text-sm font-semibold">{order.customerName}</div>
            {order.customerPhone && (
              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
            )}
          </div>
          {order.address && (
            <div className="sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Deliver to
              </div>
              <div className="mt-1 text-sm">
                {order.address.line1}
                {order.address.extras ? `, ${order.address.extras}` : ""}
                <div className="text-xs text-muted-foreground">
                  {order.address.city}
                  {order.address.region ? `, ${order.address.region}` : ""}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-semibold">Item</th>
                <th className="py-2 text-center font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Unit</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2.5 pr-2">
                    <div className="font-medium">{it.name}</div>
                    {it.pack && <div className="text-xs text-muted-foreground">{it.pack}</div>}
                  </td>
                  <td className="py-2.5 text-center tabular-nums">{it.qty}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatPKR(it.unitPriceMinor)}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {formatPKR(it.lineTotalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatPKR(order.subtotalMinor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className="tabular-nums">
              {order.shippingMinor === 0 ? "Free" : formatPKR(order.shippingMinor)}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
            <span>Total</span>
            <span className="tabular-nums">{formatPKR(order.totalMinor)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Payment method: Cash on Delivery</div>
          <div className="mt-1">Thank you for shopping with {STORE.name}!</div>
        </div>
      </div>
    </div>
  );
}
