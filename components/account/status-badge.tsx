import { cn } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-status";

const MAP: Record<string, string> = {
  DELIVERED: "bg-[oklch(0.94_0.05_150)] text-[oklch(0.42_0.1_150)]",
  FULFILLED: "bg-[oklch(0.93_0.05_230)] text-[oklch(0.42_0.11_250)]",
  SHIPPED: "bg-[oklch(0.93_0.05_230)] text-[oklch(0.42_0.11_250)]",
  IN_TRANSIT: "bg-[oklch(0.93_0.05_230)] text-[oklch(0.42_0.11_250)]",
  PAID: "bg-[oklch(0.95_0.04_90)] text-[oklch(0.48_0.1_75)]",
  PENDING: "bg-[oklch(0.95_0.02_60)] text-[oklch(0.55_0.1_60)]",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-[oklch(0.95_0.03_25)] text-[oklch(0.52_0.12_25)]",
};

/** Shipment enum → friendly label (kept separate from order labels: a PENDING
 *  shipment means "preparing", not "order placed"). */
const SHIP_LABEL: Record<string, string> = {
  PENDING: "Preparing",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
};

/**
 * Status pill for the admin. `kind` picks the vocabulary so an order and a
 * shipment never show the same raw enum differently from the customer — order
 * statuses read exactly as the customer's tracking (Order placed / Packed / …).
 */
export function StatusBadge({
  status,
  kind = "order",
}: {
  status: string;
  kind?: "order" | "shipment";
}) {
  const label = kind === "shipment" ? (SHIP_LABEL[status] ?? status) : orderStatusLabel(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        MAP[status] ?? MAP.PENDING,
      )}
    >
      {label}
    </span>
  );
}
