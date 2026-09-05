import { cn } from "@/lib/utils";
import { orderStage, STAGE_LABEL, STAGE_TONE } from "@/lib/order-status";

/**
 * OrderStatus → friendly label + tone, drawn from the shared order-status
 * vocabulary so the customer's badge reads exactly like the admin's (Order
 * placed / Packed / Out for delivery / Delivered) — no more "Confirmed" here
 * vs "PAID" in admin.
 */
export function OrderStatusBadge({
  status,
  shipment,
}: {
  status: string;
  shipment?: string | null;
}) {
  const stage = orderStage(status, shipment);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
        STAGE_TONE[stage],
      )}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}
