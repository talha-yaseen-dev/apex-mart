import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  DELIVERED: "bg-[oklch(0.94_0.05_150)] text-[oklch(0.42_0.1_150)]",
  FULFILLED: "bg-[oklch(0.93_0.05_230)] text-[oklch(0.42_0.11_250)]",
  SHIPPED: "bg-[oklch(0.93_0.05_230)] text-[oklch(0.42_0.11_250)]",
  PAID: "bg-[oklch(0.95_0.04_90)] text-[oklch(0.48_0.1_75)]",
  PENDING: "bg-[oklch(0.95_0.02_60)] text-[oklch(0.55_0.1_60)]",
  CANCELLED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-[oklch(0.95_0.03_25)] text-[oklch(0.52_0.12_25)]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        MAP[status] ?? MAP.PENDING,
      )}
    >
      {status}
    </span>
  );
}
