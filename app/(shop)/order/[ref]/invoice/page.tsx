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

/** Dashed full-width separator, matching a thermal receipt. */
function Rule() {
  return <div className="my-2 border-t border-dashed border-neutral-500" />;
}

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
    <div className="mx-auto max-w-md px-4 py-6 print:max-w-none print:p-0">
      <div className="mx-auto max-w-[420px]">
        <InvoiceActions backHref={backHref} />

        {/* Receipt */}
        <div className="mx-auto bg-white p-5 font-mono text-[13px] leading-relaxed text-neutral-900 shadow-sm print:p-0 print:shadow-none">
          {/* Header */}
          <div className="text-center">
            <div className="text-2xl font-extrabold tracking-tight">{STORE.name}</div>
            <div className="mt-0.5">
              {STORE.city}
              {STORE.region ? `, ${STORE.region}` : ""}
            </div>
            {STORE.whatsapp && <div>WhatsApp: {STORE.whatsapp}</div>}
          </div>

          <div className="mt-4 text-center">
            <div className="text-xl font-extrabold tracking-wide">INVOICE</div>
            <div className="mt-1">{order.orderNumber}</div>
            <div>{date}</div>
          </div>

          <Rule />

          {/* Billed to */}
          <div>
            <div className="font-bold">BILLED TO:</div>
            <div>{order.customerName}</div>
            {order.customerPhone && <div>{order.customerPhone}</div>}
          </div>

          {order.address && (
            <div className="mt-3">
              <div className="font-bold">DELIVER TO:</div>
              <div>
                {order.address.line1}
                {order.address.extras ? `, ${order.address.extras}` : ""}
              </div>
              <div>
                {order.address.city}
                {order.address.region ? `, ${order.address.region}` : ""}
              </div>
            </div>
          )}

          <Rule />

          {/* Items */}
          <table className="w-full tabular-nums">
            <thead>
              <tr className="font-bold">
                <th className="pb-1 text-left">ITEM</th>
                <th className="pb-1 text-center">QTY</th>
                <th className="pb-1 text-right">UNIT</th>
                <th className="pb-1 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="border-t border-dashed border-neutral-500 pt-1" />
              </tr>
              {order.items.map((it, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2">
                    {it.name}
                    {it.pack ? ` (${it.pack})` : ""}
                  </td>
                  <td className="py-1 text-center">{it.qty}</td>
                  <td className="py-1 text-right">{formatPKR(it.unitPriceMinor)}</td>
                  <td className="py-1 text-right">{formatPKR(it.lineTotalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Rule />

          {/* Totals */}
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatPKR(order.subtotalMinor)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>{order.shippingMinor === 0 ? "Free" : formatPKR(order.shippingMinor)}</span>
            </div>
          </div>

          <Rule />

          <div className="flex items-center justify-between text-lg font-extrabold">
            <span>Total:</span>
            <span>{formatPKR(order.totalMinor)}</span>
          </div>

          <Rule />

          <div>Payment method: Cash on Delivery</div>

          <Rule />

          <div className="text-center">Thank you for shopping with {STORE.name}!</div>
        </div>
      </div>
    </div>
  );
}
