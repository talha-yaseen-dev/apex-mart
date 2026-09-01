import { cn } from "@/lib/utils";

/** OrderStatus → friendly label + tone. Shared by the overview, orders list,
 *  and order detail so a status always reads the same across the account area. */
const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" },
  PAID: { label: "Confirmed", className: "border-blue-200 bg-blue-50 text-blue-700" },
  FULFILLED: { label: "Dispatched", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  DELIVERED: { label: "Delivered", className: "border-primary/20 bg-primary/10 text-primary" },
  CANCELLED: { label: "Cancelled", className: "border-red-200 bg-red-50 text-red-700" },
  REFUNDED: { label: "Refunded", className: "border-border bg-muted text-muted-foreground" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
