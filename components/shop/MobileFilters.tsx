"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterControls } from "./FilterControls";

/** Mobile "Filter" button that opens the facets in a bottom sheet (<lg). */
export function MobileFilters({ colors, sizes }: { colors: string[]; sizes: string[] }) {
  const [open, setOpen] = useState(false);
  const sp = useSearchParams();

  const count =
    (sp.get("min") || sp.get("max") ? 1 : 0) +
    (sp.get("stock") === "1" ? 1 : 0) +
    (sp.get("color") ?? "").split(",").filter(Boolean).length +
    (sp.get("size") ?? "").split(",").filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="tap-target inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-bold text-foreground lg:hidden">
        <SlidersHorizontal className="size-4" />
        Filter
        {count > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">
          <FilterControls colors={colors} sizes={sizes} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
