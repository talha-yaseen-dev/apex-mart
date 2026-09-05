"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllCustomersAction } from "@/lib/actions/access";

const CONFIRM_WORD = "DELETE ALL";

/**
 * Primary-admin control that permanently deletes EVERY customer account and all
 * their data. Because it's catastrophic and irreversible, the confirm button
 * unlocks only after the admin types the confirmation phrase. Admin accounts are
 * never affected (enforced server-side).
 */
export function DeleteAllCustomersButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const armed = phrase.trim().toUpperCase() === CONFIRM_WORD;

  function close() {
    if (busy) return;
    setOpen(false);
    setPhrase("");
    setErr("");
  }

  async function run() {
    if (!armed || busy) return;
    setErr("");
    setBusy(true);
    const res = await deleteAllCustomersAction();
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
    } else {
      setOpen(false);
      setPhrase("");
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={count === 0}
        className="h-9 shrink-0 rounded-lg border border-destructive/50 bg-destructive/5 px-3.5 text-[13px] font-bold text-destructive transition-colors hover:bg-destructive hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete all accounts
      </button>

      {open && (
        <div
          onClick={close}
          className="fixed inset-0 z-50 grid place-items-center bg-[oklch(0.2_0.02_265_/_0.45)] p-4 backdrop-blur-[2px] animate-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border bg-card p-5 text-left shadow-float"
          >
            <div className="text-[15px] font-bold text-destructive">Delete all customer accounts</div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              This permanently deletes <strong className="text-foreground">all {count} customer
              account{count === 1 ? "" : "s"}</strong> and everything tied to them — orders,
              payments, addresses, wishlists and reviews. Customer sales history disappears from
              your reports. <strong className="text-foreground">This cannot be undone.</strong> Admin
              accounts are not affected.
            </p>

            <label className="mt-4 block text-[12.5px] font-semibold">
              Type <span className="font-mono text-destructive">{CONFIRM_WORD}</span> to confirm
            </label>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder={CONFIRM_WORD}
              className="mt-1.5 h-11 w-full rounded-lg border bg-card px-3.5 text-sm focus:border-destructive focus:outline-none focus:ring-[3px] focus:ring-destructive/20"
            />

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
                disabled={!armed || busy}
                className="h-10 rounded-lg bg-destructive px-4 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Deleting…" : `Delete all ${count}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
