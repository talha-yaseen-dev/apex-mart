"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plus, MapPinPlus } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@prisma/client";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/actions/addresses";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AddressCard } from "@/components/account/AddressCard";
import { AddressForm } from "@/components/account/AddressForm";

/**
 * Client orchestrator for the address book: one shared Sheet drives both "add"
 * and "edit", and set-default / delete update optimistically. The list itself
 * is refreshed by the server actions' revalidatePath, which re-supplies the
 * `addresses` prop and resets the optimistic state.
 */
export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    addresses,
    (state: Address[], update: (a: Address[]) => Address[]) => update(state),
  );
  const [isPending, startTransition] = useTransition();

  // undefined = sheet closed; null = adding; Address = editing that one.
  const [target, setTarget] = useState<Address | null | undefined>(undefined);
  const sheetOpen = target !== undefined;

  const closeSheet = () => setTarget(undefined);

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this address? This can't be undone.")) return;
    startTransition(async () => {
      setOptimistic((s) => s.filter((a) => a.id !== id));
      const res = await deleteAddressAction(id);
      if (!res.ok) toast.error("Couldn't delete the address. Please try again.");
    });
  };

  const handleSetDefault = (id: string) => {
    startTransition(async () => {
      setOptimistic((s) => s.map((a) => ({ ...a, isDefault: a.id === id })));
      const res = await setDefaultAddressAction(id);
      if (!res.ok) toast.error("Couldn't update your default. Please try again.");
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Addresses</h1>
        {optimistic.length > 0 && (
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Add new
          </button>
        )}
      </div>

      {optimistic.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <MapPinPlus className="mx-auto size-9 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-extrabold text-foreground">No saved addresses</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an address to speed up checkout next time.
          </p>
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="tap-target mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Add address
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {optimistic.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              pending={isPending}
              onEdit={() => setTarget(a)}
              onDelete={() => handleDelete(a.id)}
              onSetDefault={() => handleSetDefault(a.id)}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-md">
          <SheetHeader className="px-0">
            <SheetTitle>{target ? "Edit address" : "Add a new address"}</SheetTitle>
            <SheetDescription>
              {target
                ? "Update the delivery details for this address."
                : "Save a delivery address to reuse at checkout."}
            </SheetDescription>
          </SheetHeader>
          {sheetOpen && (
            <AddressForm
              // Re-mount per target so the form resets between add/edit.
              key={target?.id ?? "new"}
              initial={target ?? undefined}
              defaultIsDefault={optimistic.length === 0}
              onSuccess={closeSheet}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
