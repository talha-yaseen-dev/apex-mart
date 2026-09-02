"use client";

import { MapPin, Pencil, Trash2, Check } from "lucide-react";
import type { Address } from "@prisma/client";
import { cn } from "@/lib/utils";

export function AddressCard({
  address,
  pending,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  pending?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 transition-opacity",
        address.isDefault ? "border-primary/40" : "border-border",
        pending && "opacity-60",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="font-extrabold text-foreground">{address.label}</span>
        {address.isDefault && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            Default
          </span>
        )}
      </div>

      <address className="not-italic text-sm leading-relaxed text-muted-foreground">
        {address.name && <span className="block font-semibold text-foreground">{address.name}</span>}
        <span className="block">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}
        </span>
        <span className="block">
          {address.city}
          {address.region ? `, ${address.region}` : ""} {address.postalCode}
        </span>
        <span className="block">{address.country}</span>
      </address>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          className="tap-target inline-flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Pencil className="size-4" aria-hidden />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="tap-target inline-flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </button>
        {!address.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={pending}
            className="tap-target ml-auto inline-flex items-center gap-1.5 font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden />
            Set default
          </button>
        )}
      </div>
    </div>
  );
}
