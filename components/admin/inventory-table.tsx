"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { adjustStockAction } from "@/lib/actions/admin";

type Row = {
  id: string;
  name: string;
  label: string;
  sku: string;
  stock: number;
  reserved: number;
};

const REASONS = [
  ["RESTOCK", "Restock"],
  ["ADJUSTMENT", "Manual adjustment"],
  ["RETURN", "Return to stock"],
] as const;

export function InventoryTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [active, setActive] = useState<Row | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("RESTOCK");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

  function open(r: Row) {
    setActive(r);
    setDelta("");
    setReason("RESTOCK");
    setErr("");
  }

  async function apply() {
    if (!active) return;
    const d = parseInt(delta, 10);
    if (!d) return setErr("Enter a non-zero amount (use - to remove).");
    setPending(true);
    const res = await adjustStockAction(active.id, d, reason);
    setPending(false);
    if (res.ok) {
      setActive(null);
      router.refresh();
    } else {
      setErr(res.error);
    }
  }

  return (
    <>
      {/* Mobile: stacked cards so every field fits on a phone screen. */}
      <div className="space-y-2.5 sm:hidden">
        {rows.map((r) => {
          const available = r.stock - r.reserved;
          return (
            <div key={r.id} className="rounded-xl border bg-card p-3.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">{r.label}</div>
                  <div className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">{r.sku}</div>
                </div>
                <button
                  onClick={() => open(r)}
                  className="ml-auto h-8 shrink-0 rounded-md border px-3 text-[12px] font-semibold hover:border-primary"
                >
                  Adjust
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5 text-[12.5px]">
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Reserved</dt>
                  <dd className="font-medium tabular-nums">{r.reserved}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Available</dt>
                  <dd className="font-medium tabular-nums">{available}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">On hand</dt>
                  <dd
                    className={cn(
                      "font-bold tabular-nums",
                      r.stock === 0 ? "text-destructive" : r.stock < 10 ? "text-warning" : "",
                    )}
                  >
                    {r.stock}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {/* Desktop: table with horizontal scroll fallback for narrow tablets. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Variant</th>
              <th className="px-4 py-2.5 font-semibold">SKU</th>
              <th className="px-4 py-2.5 font-semibold">Reserved</th>
              <th className="px-4 py-2.5 font-semibold">Available</th>
              <th className="px-4 py-2.5 font-semibold">On hand</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const available = r.stock - r.reserved;
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{r.label}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{r.sku}</td>
                  <td className="px-4 py-3 tabular-nums">{r.reserved}</td>
                  <td className="px-4 py-3 tabular-nums">{available}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-bold tabular-nums", r.stock === 0 ? "text-destructive" : r.stock < 10 ? "text-warning" : "")}>
                      {r.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => open(r)}
                      className="h-8 rounded-md border px-3 text-[12px] font-semibold hover:border-primary"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[oklch(0.2_0.02_265_/_0.4)] p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-float">
            <div className="mb-1 text-[15px] font-bold">Adjust stock</div>
            <div className="mb-4 text-[13px] text-muted-foreground">
              {active.name} · <span className="font-mono">{active.sku}</span> · on hand{" "}
              <strong className="text-foreground">{active.stock}</strong>
            </div>
            <label className="mb-1.5 block text-[13px] font-semibold">Adjustment (+/−)</label>
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 20 or -3"
              className="mb-3 h-11 w-full rounded-lg border bg-card px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-tint"
            />
            <label className="mb-1.5 block text-[13px] font-semibold">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-1 h-11 w-full cursor-pointer rounded-lg border bg-card px-3.5 text-sm focus:border-primary focus:outline-none"
            >
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <div className="mb-2 min-h-4 text-xs text-destructive">{err}</div>
            <div className="flex gap-2.5">
              <button
                onClick={apply}
                disabled={pending}
                className="h-11 rounded-lg bg-primary px-5 text-[13.5px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {pending ? "Applying…" : "Apply"}
              </button>
              <button
                onClick={() => setActive(null)}
                className="h-11 rounded-lg border bg-card px-5 text-[13.5px] font-bold hover:border-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
