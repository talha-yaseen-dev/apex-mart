"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PRICE_BANDS = [
  { label: "Any price", min: null, max: null },
  { label: "Under Rs. 200", min: null, max: 200 },
  { label: "Rs. 200 – 500", min: 200, max: 500 },
  { label: "Rs. 500 – 1,000", min: 500, max: 1000 },
  { label: "Over Rs. 1,000", min: 1000, max: null },
];

type FilterControlsProps = {
  /** Real facet values from /api/v1/catalog (empty arrays are hidden). */
  colors: string[];
  sizes: string[];
  onApplied?: () => void;
};

/**
 * Category filter controls, driven entirely by the catalog route's real params
 * (min/max, stock, color, size). No invented facets — colors/sizes only appear
 * when the API actually returns them (empty for the grocery catalogue).
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

  const setBand = (min: number | null, max: number | null) =>
    update((p) => {
      min == null ? p.delete("min") : p.set("min", String(min));
      max == null ? p.delete("max") : p.set("max", String(max));
    });

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
      {/* Price */}
      <fieldset>
        <legend className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Price
        </legend>
        <div className="flex flex-col gap-1">
          {PRICE_BANDS.map((b) => {
            const active =
              String(b.min ?? "") === (curMin ?? "") &&
              String(b.max ?? "") === (curMax ?? "");
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => setBand(b.min, b.max)}
                className={cn(
                  "tap-target flex items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border",
                    active ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-primary" />}
                </span>
                {b.label}
              </button>
            );
          })}
        </div>
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
          legend="Size"
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
