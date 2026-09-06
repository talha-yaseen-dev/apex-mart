"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "featured", label: "Relevance" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "newest", label: "Newest" },
];

/**
 * Sort dropdown — maps to the catalog route's `sort` param and resets page.
 * `block` renders a full-width select (for the sidebar); otherwise the compact
 * inline "Sort ▾" (for the mobile bar).
 */
export function SortSelect({ block = false }: { block?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("sort") ?? "featured";

  const onChange = (value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value === "featured") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (block) {
    return (
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort products"
        className="tap-target w-full rounded-lg border border-input bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className="hidden sm:inline">Sort</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort products"
        className="tap-target rounded-lg border border-input bg-background px-2.5 text-xs font-bold text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
