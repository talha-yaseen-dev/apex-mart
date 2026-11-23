"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllProductsAction } from "@/lib/actions/admin";

const CONFIRM_WORD = "DELETE ALL PRODUCTS";

export function DeleteAllProductsButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmed = phrase.trim().toUpperCase() === CONFIRM_WORD;

  function close() {
    if (busy) return;
    setOpen(false);
    setPhrase("");
    setError("");
  }

  async function run() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteAllProductsAction(count);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      closeAfterSuccess();
      router.refresh();
    } catch {
      setError("Couldn't delete all products. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function closeAfterSuccess() {
    setOpen(false);
    setPhrase("");
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={count === 0}
        className="h-9 shrink-0 rounded-lg border border-destructive/50 bg-destructive/5 px-3.5 text-[13px] font-bold text-destructive transition-colors hover:bg-destructive hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete all products
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-all-products-title"
          onClick={close}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border bg-card p-5 text-left shadow-float"
          >
            <h2 id="delete-all-products-title" className="font-display text-lg font-bold text-destructive">
              Delete all products?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              This permanently deletes all <strong className="text-foreground">{count} products</strong>,
              including archived products, regardless of the current search. Their variants, images,
              reviews, wishlist entries, and cart items are removed. Past orders keep their item
              records. <strong className="text-foreground">This cannot be undone.</strong>
            </p>
            <label htmlFor="delete-all-products-confirm" className="mt-4 block text-[12.5px] font-semibold">
              Type <span className="font-mono text-destructive">{CONFIRM_WORD}</span> to confirm
            </label>
            <input
              id="delete-all-products-confirm"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoFocus
              autoComplete="off"
              placeholder={CONFIRM_WORD}
              className="mt-1.5 h-11 w-full rounded-lg border bg-card px-3.5 text-sm focus:border-destructive focus:outline-none focus:ring-[3px] focus:ring-destructive/20"
            />
            {error && <p role="alert" className="mt-2 text-xs font-medium text-destructive">{error}</p>}
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-10 rounded-lg border bg-card px-4 text-[13px] font-bold hover:border-primary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={!confirmed || busy}
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
