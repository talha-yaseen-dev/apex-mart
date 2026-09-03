"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveProductAction, restoreProductAction, deleteProductAction } from "@/lib/actions/admin";

type Kind = "archive" | "delete";

/**
 * Removal controls for a product row. "Remove" archives (soft-delete) — the safe
 * default that keeps order history intact and can be undone with "Restore".
 * A permanent delete is offered only for already-archived products and only to
 * users allowed to run it (hidden for the shared demo accounts).
 */
export function ProductRowActions({
  id,
  name,
  archived,
  canArchive,
  canPermanentDelete,
}: {
  id: string;
  name: string;
  canArchive: boolean;
  archived: boolean;
  canPermanentDelete: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    if (busy) return; // guard against double submission
    setBusy(true);
    setError("");
    const res = await fn();
    if (res.ok) {
      setConfirm(null);
      setBusy(false);
      router.refresh(); // list reflects the change immediately
    } else {
      setError(res.error ?? "Something went wrong.");
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <span className="inline-flex items-center gap-2.5">
      {archived ? (
        <>
          {canArchive && (
            <button
              onClick={() => run(() => restoreProductAction(id))}
              disabled={busy}
              className="press font-semibold text-primary-hover transition-opacity hover:underline disabled:opacity-50"
            >
              {busy && !confirm ? "Restoring…" : "Restore"}
            </button>
          )}
          {canPermanentDelete && (
            <button
              onClick={() => setConfirm("delete")}
              disabled={busy}
              className="press font-semibold text-destructive transition-opacity hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </>
      ) : (
        canArchive && (
          <button
            onClick={() => setConfirm("archive")}
            title={`Remove ${name}`}
            className="press font-semibold text-destructive transition-opacity hover:underline"
          >
            Remove
          </button>
        )
      )}
      {error && <span className="text-[11.5px] text-destructive">{error}</span>}

      {confirm && (
        <ConfirmDialog
          kind={confirm}
          name={name}
          busy={busy}
          onCancel={() => !busy && setConfirm(null)}
          onConfirm={() =>
            run(() =>
              confirm === "archive" ? archiveProductAction(id) : deleteProductAction(id),
            )
          }
        />
      )}
    </span>
  );
}

function ConfirmDialog({
  kind,
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  kind: Kind;
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = kind === "delete";
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border bg-card p-5 text-left shadow-float motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-150"
      >
        <h2 className="font-display text-lg font-bold">
          {isDelete ? "Delete permanently?" : "Remove product?"}
        </h2>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          {isDelete ? (
            <>
              <span className="font-semibold text-foreground">“{name}”</span> will be
              permanently deleted. This can’t be undone. Past orders keep their own
              record of the item.
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">“{name}”</span> will be
              hidden from the store but kept for order history. You can restore it
              anytime.
            </>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="press h-9 rounded-lg border px-4 text-[13px] font-semibold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="press h-9 rounded-lg bg-destructive px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (isDelete ? "Deleting…" : "Removing…") : isDelete ? "Delete" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
