"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Check, Clock, MapPin, Phone, XCircle } from "lucide-react";
import { lookupOrder } from "@/lib/track-actions";
import type { TrackOrder } from "@/lib/order-access";
import { formatPKR } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Placed" },
  { label: "Preparing" },
  { label: "Out for delivery" },
  { label: "Delivered" },
] as const;

function stepIndex(status: string): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "PAID":
      return 1;
    case "FULFILLED":
      return 2;
    case "DELIVERED":
      return 3;
    default:
      return 0;
  }
}

const maskAddressLine = (line: string) => line.replace(/\d/g, "•");

export function TrackClient({
  initialRef,
  initialPhone,
}: {
  initialRef?: string;
  initialPhone?: string;
}) {
  const [ref, setRef] = useState(initialRef ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  const run = async (r: string, p: string) => {
    setLoading(true);
    setError(null);
    const res = await lookupOrder({ ref: r, phone: p });
    setLoading(false);
    if (res.ok) {
      setOrder(res.order);
    } else {
      setOrder(null);
      setError(res.error);
    }
  };

  // Auto-look-up when arriving from the confirmation link with both params.
  useEffect(() => {
    if (!autoRan.current && initialRef && initialPhone) {
      autoRan.current = true;
      run(initialRef, initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Track your order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your order reference and the phone number you ordered with.
      </p>

      {/* 1 — Search form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(ref, phone);
        }}
        className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-bold text-foreground">Order reference</label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase())}
            placeholder="NOVA-XXXX-XXXX"
            className={inputCls}
            autoCapitalize="characters"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-foreground">Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
            inputMode="tel"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Search className="size-4" />
          {loading ? "Searching…" : "Track order"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-center text-sm font-semibold text-muted-foreground">
          {error}
        </p>
      )}

      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: TrackOrder }) {
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const current = stepIndex(order.status);
  const bigLabel = cancelled
    ? order.status === "REFUNDED"
      ? "Refunded"
      : "Cancelled"
    : STEPS[current].label;

  const placed = new Date(order.placedAt);

  return (
    <div className="mt-6 space-y-6">
      {/* 2 — Status card (sticky on scroll) */}
      <div className="sticky top-[132px] z-20 rounded-2xl border border-border bg-card p-5 sm:top-[80px]">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Order {order.orderNumber}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {cancelled ? (
            <XCircle className="size-6 text-destructive" />
          ) : (
            <Check className="size-6 text-primary" />
          )}
          <span className={cn("text-2xl font-extrabold", cancelled ? "text-destructive" : "text-foreground")}>
            {bigLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed {placed.toLocaleDateString()} · {placed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        {order.slot && !cancelled && (
          <p className="mt-1 text-sm font-semibold text-foreground">Estimated delivery: {order.slot}</p>
        )}
      </div>

      {/* 3 — Status timeline (always vertical) */}
      {!cancelled && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-extrabold text-foreground">Progress</h2>
          <ol className="space-y-0">
            {STEPS.map((s, i) => {
              const done = i < current;
              const active = i === current;
              const isLast = i === STEPS.length - 1;
              return (
                <li key={s.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-black",
                        done && "border-primary bg-primary text-primary-foreground",
                        active && "border-primary text-primary",
                        !done && !active && "border-muted-foreground/30 text-muted-foreground/50",
                      )}
                    >
                      {done ? <Check className="size-3" /> : i + 1}
                    </span>
                    {!isLast && (
                      <span className={cn("my-1 w-0.5 flex-1", i < current ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                  <div className={cn("pb-6", isLast && "pb-0")}>
                    <p className={cn("text-sm font-bold", active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </p>
                    {i === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {placed.toLocaleDateString()} · {placed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 border-t border-border pt-3 text-xs text-muted-foreground">
            Detailed step-by-step timeline coming soon.
          </p>
        </section>
      )}

      {/* 4 — Delivery details (masked) */}
      <section className="rounded-2xl border border-border bg-card p-5">
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
                {maskAddressLine(order.address.line1)}
                {order.address.extras ? `, ${order.address.extras}` : ""}
                <span className="block text-muted-foreground">
                  {order.address.city} · {order.address.region}
                </span>
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

      {/* 5 — Items (read-only) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-foreground">
          Items ({order.items.length})
        </h2>
        <ul className="space-y-3">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center">🛒</div>
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
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
          <span className="font-extrabold text-foreground">Total</span>
          <span className="font-extrabold text-foreground">{formatPKR(order.totalMinor)}</span>
        </div>
      </section>

      {/* 6 — Help */}
      <div className="flex flex-col items-center gap-2 pb-4 text-center">
        <p className="text-sm text-muted-foreground">Something wrong with your order?</p>
        <Link
          href="/help/returns"
          className="tap-target inline-flex items-center rounded-xl border border-input px-5 text-sm font-bold text-foreground hover:bg-muted"
        >
          Report a problem
        </Link>
      </div>
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
