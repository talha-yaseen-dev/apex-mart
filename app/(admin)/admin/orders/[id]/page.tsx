import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { getAdminOrder } from "@/lib/admin";
import { requireEmployee, can } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { StatusBadge } from "@/components/account/status-badge";
import { OrderFulfillment } from "@/components/admin/order-fulfillment";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEmployee();
  const { id } = await params;
  const [o, canFulfill, canCancel, canRefundPerm] = await Promise.all([
    getAdminOrder(id),
    can(PERMISSIONS.ORDERS_FULFILL),
    can(PERMISSIONS.ORDERS_CANCEL),
    can(PERMISSIONS.ORDERS_REFUND),
  ]);
  if (!o) notFound();

  const refundEligible =
    o.status !== OrderStatus.REFUNDED &&
    o.status !== OrderStatus.PENDING &&
    o.status !== OrderStatus.CANCELLED &&
    o.payments.some((p) => p.status === "SUCCEEDED");

  return (
    <div className="animate-fade max-w-3xl">
      <Link href="/admin/orders" className="text-[13px] font-semibold text-primary-hover">
        ← All orders
      </Link>
      <div className="mb-1 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{o.orderNumber}</h1>
        <StatusBadge status={o.status} />
      </div>
      <div className="mb-5 text-[13px] text-muted-foreground">
        {o.user.name} · {o.user.email} ·{" "}
        {o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-bold">Items</div>
        {o.items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{it.productName}</div>
              <div className="font-mono text-[11.5px] text-muted-foreground">{it.sku}</div>
            </div>
            <span className="text-[12.5px] text-muted-foreground">
              {formatMoney(it.unitPriceMinor)} × {it.quantity}
            </span>
            <span className="w-20 text-right text-[13px] font-semibold">
              {formatMoney(it.unitPriceMinor * it.quantity)}
            </span>
          </div>
        ))}
        <div className="flex flex-col gap-1.5 px-4 py-3 text-[13px]">
          <Row label="Subtotal" value={formatMoney(o.subtotalMinor)} />
          {o.discountMinor > 0 && <Row label="Discount" value={`−${formatMoney(o.discountMinor)}`} />}
          <Row label="Shipping" value={o.shippingMinor === 0 ? "Free" : formatMoney(o.shippingMinor)} />
          <Row label="Tax" value={formatMoney(o.taxMinor)} />
          <div className="my-1 h-px bg-border" />
          <div className="flex items-baseline justify-between">
            <span className="font-bold">Total</span>
            <span className="font-display text-lg font-bold">{formatMoney(o.totalMinor)}</span>
          </div>
        </div>
      </div>

      {o.shipments.length > 0 && (
        <div className="mb-4 rounded-xl border bg-card p-4 text-[13px]">
          <span className="font-bold">Shipment</span> · {o.shipments[0]!.carrier} ·{" "}
          <span className="font-mono">{o.shipments[0]!.trackingNumber}</span> ·{" "}
          <StatusBadge status={o.shipments[0]!.status} />
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-bold">Fulfilment</div>
        <OrderFulfillment
          orderId={o.id}
          status={o.status}
          shipmentStatus={o.shipments[0]?.status ?? null}
          canFulfill={canFulfill}
          canCancel={canCancel}
          refundEligible={refundEligible}
          canRefund={canRefundPerm}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
