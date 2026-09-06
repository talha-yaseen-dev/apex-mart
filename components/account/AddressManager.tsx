"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Plus, MapPinPlus } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@prisma/client";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/actions/addresses";
import { AddressCard } from "@/components/account/AddressCard";

/**
 * Address book list. Adding/editing happens on its own page
 * (/account/addresses/new and /[id]/edit) — this view just lists the saved
 * addresses; set-default and delete update optimistically and are reconciled by
 * the server actions' revalidatePath.
 */
export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    addresses,
    (state: Address[], update: (a: Address[]) => Address[]) => update(state),
  );
  const [isPending, startTransition] = useTransition();

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
          <Link
            href="/account/addresses/new"
            className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Add new
          </Link>
        )}
      </div>

      {optimistic.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <MapPinPlus className="mx-auto size-9 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-extrabold text-foreground">No saved addresses</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an address to speed up checkout next time.
          </p>
          <Link
            href="/account/addresses/new"
            className="tap-target mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            Add address
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {optimistic.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              pending={isPending}
              editHref={`/account/addresses/${a.id}/edit`}
              onDelete={() => handleDelete(a.id)}
              onSetDefault={() => handleSetDefault(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
