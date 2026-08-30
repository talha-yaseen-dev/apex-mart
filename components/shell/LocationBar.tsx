"use client";

import { useEffect, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { DELIVERY_ZONES, DEFAULT_ZONE_ID, zoneById } from "@/lib/delivery-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "mart.zone";

/**
 * Delivery-location indicator in the top utility bar. Lets the shopper pick one
 * of the hardcoded delivery zones; the choice persists per device so fees and
 * slots stay honest from the first screen. (Zones are static — see
 * lib/delivery-config.ts.)
 */
export function LocationBar() {
  const [zoneId, setZoneId] = useState(DEFAULT_ZONE_ID);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DELIVERY_ZONES.some((z) => z.id === saved)) setZoneId(saved);
  }, []);

  const pick = (id: string) => {
    setZoneId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const zone = zoneById(zoneId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="tap-target -ml-1.5 inline-flex items-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold text-slate-100 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50">
        <MapPin aria-hidden className="size-3.5 text-primary" />
        <span className="font-medium text-slate-400">Deliver to</span>
        <span className="max-w-[9rem] truncate">{zone.name}</span>
        <ChevronDown aria-hidden className="size-3.5 text-slate-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Choose your delivery area</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DELIVERY_ZONES.map((z) => (
          <DropdownMenuItem
            key={z.id}
            onSelect={() => pick(z.id)}
            className="cursor-pointer justify-between gap-4"
          >
            <span>{z.name}</span>
            {z.id === zone.id && (
              <span className="text-xs font-bold text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
