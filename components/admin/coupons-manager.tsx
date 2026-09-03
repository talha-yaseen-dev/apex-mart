"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Coupon } from "@prisma/client";
import { cn, formatMoney } from "@/lib/utils";
import {
  createCouponAction,
  toggleCouponAction,
  deleteCouponAction,
} from "@/lib/actions/admin";

const TYPE_LABEL: Record<string, string> = {
  PERCENT: "% off",
  FIXED: "$ off",
  FREE_SHIPPING: "Free ship",
};

export function CouponsManager({
  coupons,
  canManage,
  canToggle,
}: {
  coupons: Coupon[];
  canManage: boolean;
  canToggle: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "PERCENT", value: "", minSpend: "", cap: "" });
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function toggle(id: string) {
    start(async () => {
      await toggleCouponAction(id);
      router.refresh();
    });
  }

  function remove(c: Coupon) {
    setErr("");
    start(async () => {
      const res = await deleteCouponAction(c.id);
      if (!res.ok) return setErr(res.error);
      router.refresh();
    });
  }

  function create() {
    setErr("");
    start(async () => {
      const res = await createCouponAction({
        code: form.code,
        type: form.type,
        value: parseInt(form.value || "0", 10),
        minSpendMinor: Math.round(parseFloat(form.minSpend || "0") * 100),
        maxRedemptions: parseInt(form.cap || "0", 10),
      });
      if (!res.ok) return setErr(res.error);
      setOpen(false);
      setForm({ code: "", type: "PERCENT", value: "", minSpend: "", cap: "" });
      router.refresh();
    });
  }

  return (
    <div className="animate-fade">
      <div className="mb-5 flex items-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">Coupons</h1>
        {canManage && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-auto h-10 rounded-lg bg-primary px-4 text-[13.5px] font-bold text-white hover:bg-primary-hover"
          >
            {open ? "Close" : "+ New coupon"}
          </button>
        )}
      </div>

      {!open && err && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-[13px] text-destructive">
          {err}
        </div>
      )}

      {open && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <input placeholder="CODE" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="h-10 rounded-lg border bg-card px-3 font-mono text-[13px] uppercase focus:border-primary focus:outline-none" />
            <select value={form.type} onChange={(e) => set("type", e.target.value)} className="h-10 cursor-pointer rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none">
              <option value="PERCENT">% off</option>
              <option value="FIXED">$ off (cents)</option>
              <option value="FREE_SHIPPING">Free shipping</option>
            </select>
            <input placeholder="Value" value={form.value} onChange={(e) => set("value", e.target.value.replace(/[^0-9]/g, ""))} className="h-10 rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none" />
            <input placeholder="Min spend $" value={form.minSpend} onChange={(e) => set("minSpend", e.target.value.replace(/[^0-9.]/g, ""))} className="h-10 rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none" />
            <input placeholder="Max uses" value={form.cap} onChange={(e) => set("cap", e.target.value.replace(/[^0-9]/g, ""))} className="h-10 rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none" />
          </div>
          <div className="mt-1 min-h-4 text-xs text-destructive">{err}</div>
          <button onClick={create} disabled={pending} className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-white hover:bg-primary-hover disabled:opacity-60">
            {pending ? "Creating…" : "Create coupon"}
          </button>
        </div>
      )}

      {/* Mobile: stacked cards so every field fits on a phone screen. */}
      <div className="space-y-2.5 sm:hidden">
        {coupons.map((c) => (
          <div key={c.id} className="rounded-xl border bg-card p-3.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{c.code}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase",
                  c.active
                    ? "bg-[oklch(0.94_0.05_150)] text-[oklch(0.42_0.1_150)]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {c.active ? "Active" : "Off"}
              </span>
              <div className="ml-auto flex items-center gap-3">
                {canToggle && (
                  <button
                    disabled={pending}
                    onClick={() => toggle(c.id)}
                    className="text-[12.5px] font-semibold text-primary-hover disabled:opacity-50"
                  >
                    {c.active ? "Disable" : "Enable"}
                  </button>
                )}
                {canManage && (
                  <button
                    disabled={pending}
                    onClick={() => remove(c)}
                    className="text-[12.5px] font-semibold text-destructive disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2.5 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Type</dt>
                <dd className="font-medium">{TYPE_LABEL[c.type]}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Value</dt>
                <dd className="font-medium tabular-nums">
                  {c.type === "PERCENT"
                    ? `${c.value}%`
                    : c.type === "FIXED"
                      ? formatMoney(c.value)
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Redeemed</dt>
                <dd className="font-medium tabular-nums">
                  {c.timesRedeemed}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Min spend</dt>
                <dd className="font-medium tabular-nums">
                  {c.minSpendMinor ? formatMoney(c.minSpendMinor) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {coupons.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            No coupons yet.
          </div>
        )}
      </div>

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full min-w-[780px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Code</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Value</th>
              <th className="px-4 py-2.5 font-semibold">Min spend</th>
              <th className="px-4 py-2.5 font-semibold">Redeemed</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3">{TYPE_LABEL[c.type]}</td>
                <td className="px-4 py-3 tabular-nums">
                  {c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? formatMoney(c.value) : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{c.minSpendMinor ? formatMoney(c.minSpendMinor) : "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {c.timesRedeemed}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase", c.active ? "bg-[oklch(0.94_0.05_150)] text-[oklch(0.42_0.1_150)]" : "bg-muted text-muted-foreground")}>
                    {c.active ? "Active" : "Off"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canToggle && (
                      <button
                        disabled={pending}
                        onClick={() => toggle(c.id)}
                        className="text-[12.5px] font-semibold text-primary-hover disabled:opacity-50"
                      >
                        {c.active ? "Disable" : "Enable"}
                      </button>
                    )}
                    {canManage && (
                      <button
                        disabled={pending}
                        onClick={() => remove(c)}
                        className="text-[12.5px] font-semibold text-destructive disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
