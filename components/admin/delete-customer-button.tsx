"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomerAction } from "@/lib/actions/access";

/**
 * Primary-admin control to permanently delete a customer account. Opens a
 * confirmation dialog; for a customer who has orders it offers a checkbox to
 * also erase their order/payment data (required to delete them — order rows
 * can't be orphaned). The server enforces the same rules.
 */
export function DeleteCustomerButton({
  userId,
  name,
  orders,
}: {
  userId: string;
  name: string;
  orders: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purge, setPurge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const hasOrders = orders > 0;
  // A customer with orders can only be removed if their data is purged too.
  const canConfirm = !busy && (!hasOrders || purge);

  function close() {
    if (busy) return;
    setOpen(false);
    setPurge(false);
    setErr("");
  }

  async function run() {
    if (!canConfirm) return;
    setErr("");
    setBusy(true);
    const res = await deleteCustomerAction(userId, purge);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[12.5px] font-semibold text-destructive hover:underline"
      >
        Delete
      </button>

      {open && (
        <div
          onClick={close}
          className="fixed inset-0 z-50 grid place-items-center bg-[oklch(0.2_0.02_265_/_0.45)] p-4 backdrop-blur-[2px] animate-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border bg-card p-5 text-left shadow-float"
          >
            <div className="text-[15px] font-bold">Delete account</div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Permanently delete <strong className="text-foreground">{name}</strong>’s account,
              including their addresses, wishlist and reviews. This can’t be undone.
            </p>

            {hasOrders && (
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[12.5px] leading-relaxed">
                <input
                  type="checkbox"
                  checked={purge}
                  onChange={(e) => setPurge(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--destructive)]"
                />
                <span>
                  Also delete their{" "}
                  <strong>
                    {orders} order{orders === 1 ? "" : "s"}
                  </strong>
                  , payments and records. This removes them from sales history and reports.
                </span>
              </label>
            )}
            {hasOrders && !purge && (
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                A customer with orders can only be deleted if you also delete their order data —
                otherwise use Deactivate.
              </p>
            )}

            {err && <p className="mt-2 text-xs font-medium text-destructive">{err}</p>}

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={close}
                disabled={busy}
                className="h-10 rounded-lg border bg-card px-4 text-[13px] font-bold hover:border-primary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={!canConfirm}
                className="h-10 rounded-lg bg-destructive px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
