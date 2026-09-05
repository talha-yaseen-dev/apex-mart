"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  refundOrderAction,
  transitionOrderAction,
  markOrderShippedAction,
} from "@/lib/actions/admin";

const STEPS = [
  { label: "Order placed", desc: "Payment received" },
  { label: "Packed", desc: "Items packed and ready" },
  { label: "Shipped", desc: "Handed to the carrier" },
  { label: "Delivered", desc: "Arrived with the customer" },
] as const;

type Status = "PENDING" | "PAID" | "FULFILLED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
type ShipStatus = "PENDING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | null;

/** Index of the last completed pipeline step (−1 = not paid yet). */
function completedStep(status: Status, ship: ShipStatus): number {
  if (status === "DELIVERED") return 3;
  if (status === "FULFILLED") {
    return ship && ship !== "PENDING" ? 2 : 1; // shipped → 2, packed only → 1
  }
  if (status === "PAID") return 0;
  return -1;
}

export function OrderFulfillment({
  orderId,
  status,
  shipmentStatus,
  canFulfill,
  canCancel: canCancelPerm,
  refundEligible,
  canRefund,
}: {
  orderId: string;
  status: Status;
  shipmentStatus: ShipStatus;
  canFulfill: boolean;
  canCancel: boolean;
  refundEligible: boolean;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr("");
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Action failed.");
      else router.refresh();
    });

  const terminal = status === "CANCELLED" || status === "REFUNDED";
  const done = completedStep(status, shipmentStatus);

  // The single "advance to the next stage" action for the current state.
  const nextAction: { label: string; fn: () => Promise<{ ok: boolean; error?: string }> } | null =
    status === "PENDING"
      ? { label: "Mark as paid", fn: () => transitionOrderAction(orderId, "PAID") }
      : status === "PAID"
        ? { label: "Mark as packed", fn: () => transitionOrderAction(orderId, "FULFILLED") }
        : status === "FULFILLED" && (!shipmentStatus || shipmentStatus === "PENDING")
          ? { label: "Mark as shipped", fn: () => markOrderShippedAction(orderId) }
          : status === "FULFILLED"
            ? { label: "Mark as delivered", fn: () => transitionOrderAction(orderId, "DELIVERED") }
            : null;

  // Cancelling a paid order is a manager/admin capability, not routine fulfilment.
  const canCancel = canCancelPerm && (status === "PENDING" || status === "PAID");

  return (
    <div>
      {terminal ? (
        <p className="text-[13px] font-medium text-muted-foreground">
          This order was {status === "CANCELLED" ? "cancelled" : "refunded"}. No further
          fulfilment actions are available.
        </p>
      ) : (
        <ol className="mb-4">
          {STEPS.map((step, i) => {
            const isDone = i <= done;
            const isNext = i === done + 1;
            const last = i === STEPS.length - 1;
            return (
              <li key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold",
                      isDone
                        ? "border-success bg-success text-white"
                        : isNext
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : i + 1}
                  </span>
                  {!last && (
                    <span
                      className={cn("my-0.5 w-0.5 flex-1", i < done ? "bg-success" : "bg-border")}
                    />
                  )}
                </div>
                <div className={cn("pb-4", last && "pb-0")}>
                  <div
                    className={cn(
                      "text-[13.5px] font-semibold",
                      isDone || isNext ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{step.desc}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-2.5">
        {canFulfill && nextAction && (
          <button
            disabled={pending}
            onClick={() => run(nextAction.fn)}
            className="h-10 rounded-lg bg-primary px-4 text-[13px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Working…" : nextAction.label}
          </button>
        )}
        {!canFulfill && !terminal && (
          <p className="text-[13px] text-muted-foreground">
            You don&apos;t have permission to advance this order.
          </p>
        )}

        {canCancel && (
          <button
            disabled={pending}
            onClick={() =>
              confirm("Cancel this order and release its stock?") &&
              run(() => transitionOrderAction(orderId, "CANCELLED"))
            }
            className="h-10 rounded-lg border px-4 text-[13px] font-semibold text-muted-foreground hover:border-primary disabled:opacity-60"
          >
            Cancel order
          </button>
        )}

        {refundEligible && canRefund && (
          <button
            disabled={pending}
            onClick={() =>
              confirm("Issue a full refund and restock the items?") &&
              run(() => refundOrderAction(orderId))
            }
            className="h-10 rounded-lg border border-[oklch(0.85_0.07_25)] bg-[oklch(0.97_0.02_25)] px-4 text-[13px] font-bold text-[oklch(0.5_0.14_25)] hover:bg-[oklch(0.95_0.03_25)] disabled:opacity-60"
          >
            Issue full refund
          </button>
        )}
      </div>
      {err && <div className="mt-2 text-[12.5px] text-destructive">{err}</div>}
    </div>
  );
}
