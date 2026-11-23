"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type FilterControlsProps = {
  /** Real facet values from /api/v1/catalog (empty arrays are hidden). */
  colors: string[];
  sizes: string[];
  onApplied?: () => void;
};

/**
 * Category filter controls, driven entirely by the catalog route's real params
 * (min/max, stock, color, size). No invented facets — colors/sizes only appear
 * when the API actually returns them (tyre sizes come from variant attributes).
 */
export function FilterControls({ colors, sizes, onApplied }: FilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(sp.toString());
    mutate(next);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    onApplied?.();
  };

  const curMin = sp.get("min");
  const curMax = sp.get("max");
  const stockOn = sp.get("stock") === "1";
  const activeColors = (sp.get("color") ?? "").split(",").filter(Boolean);
  const activeSizes = (sp.get("size") ?? "").split(",").filter(Boolean);

  // Custom price range inputs — kept in sync with the URL params (e.g. after
  // "Clear all"), applied on Enter or the Apply button. Empty = no bound.
  const [minInput, setMinInput] = useState(curMin ?? "");
  const [maxInput, setMaxInput] = useState(curMax ?? "");
  useEffect(() => {
    setMinInput(curMin ?? "");
    setMaxInput(curMax ?? "");
  }, [curMin, curMax]);

  const applyPrice = () =>
    update((p) => {
      const mn = minInput.trim();
      const mx = maxInput.trim();
      if (mn) p.set("min", mn);
      else p.delete("min");
      if (mx) p.set("max", mx);
      else p.delete("max");
    });

  const priceDirty = (minInput.trim() || "") !== (curMin ?? "") || (maxInput.trim() || "") !== (curMax ?? "");

  const toggleList = (key: "color" | "size", value: string, current: string[]) =>
    update((p) => {
      const nextList = current.includes(value)
        ? current.filter((x) => x !== value)
        : [...current, value];
      if (nextList.length) p.set(key, nextList.join(","));
      else p.delete(key);
    });

  const clearAll = () =>
    update((p) => {
      ["min", "max", "stock", "color", "size"].forEach((k) => p.delete(k));
    });

  const hasActive =
    !!curMin || !!curMax || stockOn || activeColors.length > 0 || activeSizes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Price — custom min/max range (Rs.) */}
      <fieldset>
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Price (Rs.)
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Minimum price in rupees"
            className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <span className="text-sm text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Maximum price in rupees"
            className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <button
          type="button"
          onClick={applyPrice}
          disabled={!priceDirty}
          className="tap-target mt-2 w-full rounded-lg border border-primary/40 bg-primary/5 px-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </fieldset>

      {/* Availability */}
      <fieldset>
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Availability
        </legend>
        <button
          type="button"
          onClick={() => update((p) => (stockOn ? p.delete("stock") : p.set("stock", "1")))}
          className="tap-target flex w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded border",
              stockOn ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
            )}
          >
            {stockOn && <span className="text-[10px] font-black leading-none">✓</span>}
          </span>
          In stock only
        </button>
      </fieldset>

      {/* Colors / sizes only appear if the API returns them */}
      {colors.length > 0 && (
        <FacetCheckboxes
          legend="Colour"
          options={colors}
          active={activeColors}
          onToggle={(v) => toggleList("color", v, activeColors)}
        />
      )}
      {sizes.length > 0 && (
        <FacetCheckboxes
          legend="Tyre size"
          options={sizes}
          active={activeSizes}
          onToggle={(v) => toggleList("size", v, activeSizes)}
        />
      )}

      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="tap-target self-start rounded-lg px-2 text-sm font-bold text-primary hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function FacetCheckboxes({
  legend,
  options,
  active,
  onToggle,
}: {
  legend: string;
  options: string[];
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        {legend}
      </legend>
      <div className="flex flex-col gap-1">
        {options.map((o) => {
          const on = active.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className="tap-target flex items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {on && <span className="text-[10px] font-black leading-none">✓</span>}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
