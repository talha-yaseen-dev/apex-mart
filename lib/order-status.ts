/**
 * Single source of truth for how an order's lifecycle reads to humans — shared
 * by the customer tracking pages and the admin so the two never drift ("PAID"
 * in admin vs "Confirmed" for the customer was the old mismatch).
 *
 * Apex Tyres is Cash-on-Delivery: money is collected by the rider on delivery,
 * so an order that has been captured is "placed", never "paid". The four public
 * stages are: Order placed → Packed → Out for delivery → Delivered.
 */

export type OrderStage =
  | "placed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

/** Customer-facing label for each pipeline stage (COD wording). */
export const STAGE_LABEL: Record<OrderStage, string> = {
  placed: "Order placed",
  packed: "Packed",
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Badge tone per stage (Tailwind classes), tuned to match the storefront. */
export const STAGE_TONE: Record<OrderStage, string> = {
  placed: "border-blue-200 bg-blue-50 text-blue-700",
  packed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  shipped: "border-violet-200 bg-violet-50 text-violet-700",
  delivered: "border-primary/20 bg-primary/10 text-primary",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-border bg-muted text-muted-foreground",
};

/**
 * Canonical fulfilment stage from an OrderStatus (+ optional ShipmentStatus).
 * PENDING and PAID both read as "placed" (COD: cash is due on delivery). A
 * FULFILLED order is "packed" until its shipment leaves, then "out for delivery".
 */
export function orderStage(
  status: string,
  shipment?: string | null,
): OrderStage {
  switch (status) {
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    case "DELIVERED":
      return "delivered";
    case "FULFILLED":
      return shipment && shipment !== "PENDING" ? "shipped" : "packed";
    default:
      return "placed"; // PENDING, PAID
  }
}

/** Friendly label straight from an OrderStatus (list views without shipment). */
export function orderStatusLabel(status: string, shipment?: string | null): string {
  return STAGE_LABEL[orderStage(status, shipment)];
}
