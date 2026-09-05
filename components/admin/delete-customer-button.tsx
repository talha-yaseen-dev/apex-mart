"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomerAction } from "@/lib/actions/access";

/**
 * Primary-admin control to permanently delete a customer account. Disabled for
 * customers who have orders (those must be deactivated to preserve order
 * history — the server enforces this too). Confirms before the irreversible act.
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blocked = orders > 0;

  async function run() {
    if (blocked || busy) return;
    if (!window.confirm(`Permanently delete ${name}'s account? This can’t be undone.`)) return;
    setErr("");
    setBusy(true);
    const res = await deleteCustomerAction(userId);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={run}
        disabled={busy || blocked}
        title={blocked ? "Has orders — deactivate instead of deleting" : undefined}
        className="text-[12.5px] font-semibold text-destructive hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {err && <span className="max-w-[180px] text-right text-[11px] text-destructive">{err}</span>}
    </div>
  );
}
