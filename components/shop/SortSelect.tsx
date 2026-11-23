"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "featured", label: "Relevance" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "newest", label: "Newest" },
];

/**
 * Sort dropdown — a styled Radix Select (not the native OS dropdown) that maps
 * to the catalog route's `sort` param and resets the page. `block` fills the
 * sidebar width; otherwise it's the compact trigger for the mobile bar.
 */
export function SortSelect({ block = false, showPrice = true }: { block?: boolean; showPrice?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("sort") ?? "featured";
  const currentLabel = OPTIONS.find((o) => o.value === current)?.label ?? "Relevance";

  const onChange = (value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value === "featured") next.delete("sort");
    else next.set("sort", value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Sort products"
        className={cn("font-semibold text-foreground", block ? "h-11 w-full" : "h-9")}
      >
        <span>{currentLabel}</span>
      </SelectTrigger>
      <SelectContent align="start">
        {OPTIONS.filter((o) => showPrice || !o.value.startsWith("price-")).map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
