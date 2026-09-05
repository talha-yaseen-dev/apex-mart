"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { adjustStockAction } from "@/lib/actions/admin";
import { CATEGORY_ICONS } from "@/lib/home-content";

type Row = {
  id: string;
  name: string;
  label: string;
  sku: string;
  stock: number;
  reserved: number;
  categorySlug: string;
  categoryName: string;
};

const REASONS = [
  ["RESTOCK", "Restock"],
  ["ADJUSTMENT", "Manual adjustment"],
  ["RETURN", "Return to stock"],
] as const;

// Stock buckets shared by the status filter and the health tiles.
const LOW_THRESHOLD = 10;
type Status = "ALL" | "IN" | "LOW" | "OUT";
const STATUSES: [Status, string][] = [
  ["ALL", "All"],
  ["IN", "In stock"],
  ["LOW", "Low"],
  ["OUT", "Out"],
];
const bucketOf = (stock: number): Exclude<Status, "ALL"> =>
  stock === 0 ? "OUT" : stock < LOW_THRESHOLD ? "LOW" : "IN";

type Sort = "stock-asc" | "stock-desc" | "name";
const SORTS: [Sort, string][] = [
  ["stock-asc", "Stock: low → high"],
  ["stock-desc", "Stock: high → low"],
  ["name", "Name: A → Z"],
];

export function InventoryTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  // Adjust-stock modal state.
  const [active, setActive] = useState<Row | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("RESTOCK");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

  // Filters / view state.
  const [cat, setCat] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("ALL");
  const [sort, setSort] = useState<Sort>("stock-asc");

  // Global health tiles — computed over the whole catalog, not the filtered view.
  const stats = useMemo(() => {
    let onHand = 0;
    let low = 0;
    let out = 0;
    for (const r of rows) {
      onHand += r.stock;
      const b = bucketOf(r.stock);
      if (b === "LOW") low++;
      else if (b === "OUT") out++;
    }
    return { skus: rows.length, onHand, low, out };
  }, [rows]);

  // Category list (with counts), ordered like the storefront aisles.
  const categories = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; count: number }>();
    for (const r of rows) {
      const e = m.get(r.categorySlug) ?? { slug: r.categorySlug, name: r.categoryName, count: 0 };
      e.count++;
      m.set(r.categorySlug, e);
    }
    const order = Object.keys(CATEGORY_ICONS);
    const rank = (s: string) => (order.indexOf(s) === -1 ? 999 : order.indexOf(s));
    return [...m.values()].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (cat !== "ALL" && r.categorySlug !== cat) return false;
      if (status !== "ALL" && bucketOf(r.stock) !== status) return false;
      if (
        query &&
        !r.name.toLowerCase().includes(query) &&
        !r.sku.toLowerCase().includes(query) &&
        !r.label.toLowerCase().includes(query)
      )
        return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stock-desc") return b.stock - a.stock;
      return a.stock - b.stock;
    });
    return out;
  }, [rows, cat, q, status, sort]);

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

  // Live preview of where the adjustment lands. Empty/"-"/0 → no change shown.
  const parsedDelta = parseInt(delta, 10);
  const dirty = !Number.isNaN(parsedDelta) && parsedDelta !== 0;
  const nextStock = active ? active.stock + (Number.isNaN(parsedDelta) ? 0 : parsedDelta) : 0;
  const nextAvailable = active ? nextStock - active.reserved : 0;
  const wouldBeNegative = nextStock < 0;

  const catButton = (slug: string, name: string, count: number) => {
    const activeCat = cat === slug;
    return (
      <button
        key={slug}
        onClick={() => setCat(slug)}
        className={cn(
          "flex w-full shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] transition-colors",
          activeCat
            ? "border-primary/40 bg-primary-tint font-semibold text-primary"
            : "border-transparent hover:bg-muted",
        )}
      >
        <span aria-hidden className="text-base leading-none">
          {slug === "ALL" ? "🗂️" : CATEGORY_ICONS[slug] ?? "📦"}
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            activeCat ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Health tiles */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "SKUs", value: stats.skus, tone: "" },
          { label: "Units on hand", value: stats.onHand, tone: "" },
          { label: "Low stock", value: stats.low, tone: stats.low ? "text-warning" : "" },
          { label: "Out of stock", value: stats.out, tone: stats.out ? "text-destructive" : "" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-3.5 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className={cn("mt-0.5 text-2xl font-bold tabular-nums", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + status + sort */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or SKU…"
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-tint"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5">
            {STATUSES.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatus(v)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  status === v ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 cursor-pointer rounded-lg border bg-card px-2.5 text-[12.5px] font-semibold focus:border-primary focus:outline-none"
            aria-label="Sort"
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile category chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-max min-w-[7rem]">{catButton("ALL", "All products", rows.length)}</div>
        {categories.map((c) => (
          <div key={c.slug} className="w-max min-w-[7rem]">
            {catButton(c.slug, c.name, c.count)}
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Desktop category rail */}
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-1 rounded-xl border bg-card p-2">
            <div className="px-2 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Aisle
            </div>
            {catButton("ALL", "All products", rows.length)}
            {categories.map((c) => catButton(c.slug, c.name, c.count))}
          </div>
        </aside>

        {/* Main list */}
        <div className="min-w-0">
          <div className="mb-2 text-[12px] text-muted-foreground">
            Showing <strong className="text-foreground tabular-nums">{filtered.length}</strong> of{" "}
            <span className="tabular-nums">{rows.length}</span> variants
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              No variants match these filters.
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards so every field fits on a phone screen. */}
              <div className="space-y-2.5 sm:hidden">
                {filtered.map((r) => {
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
                              r.stock === 0 ? "text-destructive" : r.stock < LOW_THRESHOLD ? "text-warning" : "",
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
                    {filtered.map((r) => {
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
                            <span
                              className={cn(
                                "font-bold tabular-nums",
                                r.stock === 0 ? "text-destructive" : r.stock < LOW_THRESHOLD ? "text-warning" : "",
                              )}
                            >
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
            </>
          )}
        </div>
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-[oklch(0.2_0.02_265_/_0.45)] p-4 backdrop-blur-[2px] animate-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-float"
          >
            {/* Header — title + product identity + close */}
            <div className="flex items-start gap-3 border-b bg-muted/30 px-5 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold leading-tight">Adjust stock</div>
                <div className="truncate text-[13px] font-medium">{active.name}</div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {active.label} · <span className="font-mono">{active.sku}</span>
                </div>
              </div>
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {/* Current-stock context strip */}
              <dl className="mb-4 grid grid-cols-3 divide-x rounded-xl border bg-muted/20 text-center">
                {[
                  ["Reserved", active.reserved],
                  ["Available", active.stock - active.reserved],
                  ["On hand", active.stock],
                ].map(([k, val]) => (
                  <div key={k} className="px-2 py-2.5">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 text-[15px] font-bold tabular-nums">{val}</dd>
                  </div>
                ))}
              </dl>

              <label className="mb-1.5 block text-[13px] font-semibold">Adjustment (+/−)</label>
              <input
                autoFocus
                value={delta}
                onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 20 or -3"
                className="h-11 w-full rounded-lg border bg-card px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-tint"
              />

              {/* Before → after preview */}
              <div
                className={cn(
                  "mt-3 flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-[13px]",
                  !dirty
                    ? "border-dashed text-muted-foreground"
                    : wouldBeNegative
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-primary/40 bg-primary-tint",
                )}
              >
                <span className="font-medium">On hand after</span>
                <span className="flex items-center gap-2 font-bold tabular-nums">
                  <span className="text-muted-foreground">{active.stock}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span
                    className={cn(
                      "text-[15px]",
                      !dirty ? "" : wouldBeNegative ? "text-destructive" : "text-primary",
                    )}
                  >
                    {nextStock}
                  </span>
                </span>
              </div>
              {dirty && !wouldBeNegative && (
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                  Available becomes <strong className="text-foreground tabular-nums">{nextAvailable}</strong> after reserved stock.
                </p>
              )}
              {wouldBeNegative && (
                <p className="mt-1.5 text-[11.5px] font-medium text-destructive">
                  Can’t remove more than the {active.stock} on hand.
                </p>
              )}

              <label className="mb-1.5 mt-4 block text-[13px] font-semibold">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-11 w-full cursor-pointer rounded-lg border bg-card px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-tint"
              >
                {REASONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>

              <div className="mb-3 mt-2 min-h-4 text-xs text-destructive">{err}</div>
              <div className="flex gap-2.5">
                <button
                  onClick={apply}
                  disabled={pending || wouldBeNegative}
                  className="h-11 flex-1 rounded-lg bg-primary px-5 text-[13.5px] font-bold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {pending ? "Applying…" : "Apply adjustment"}
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
        </div>
      )}
    </>
  );
}
