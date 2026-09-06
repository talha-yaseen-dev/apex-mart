"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { deleteAccountAction } from "@/lib/actions/profile";

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * Danger zone — permanently closes the account. Requires the current password
 * (for password accounts) and typing DELETE. Past orders stay on the store's
 * records; saved addresses, cart and wishlist are removed. On success the user
 * is signed out and sent home.
 */
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);

  const canDelete =
    confirmText.trim().toUpperCase() === "DELETE" && (!hasPassword || password.length > 0);

  async function onDelete() {
    if (!canDelete || pending) return;
    setPending(true);
    try {
      const res = await deleteAccountAction({ password, confirmText });
      if (res.ok) {
        toast.success("Your account has been closed.");
        await signOut({ callbackUrl: "/" });
      } else {
        toast.error(res.error);
        setPending(false);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  function cancel() {
    setOpen(false);
    setPassword("");
    setConfirmText("");
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
      <h2 className="mb-1 text-base font-extrabold text-red-700">Delete account</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Permanently closes your account and removes your saved addresses, cart and wishlist. Your
        past orders stay on record. This can’t be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-target inline-flex items-center justify-center rounded-xl border border-red-300 bg-background px-5 text-sm font-bold text-red-700 transition-colors hover:bg-red-600 hover:text-white"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          {hasPassword && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground">Current password</label>
              <input
                type="password"
                autoComplete="current-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              Type <span className="font-mono font-extrabold">DELETE</span> to confirm
            </label>
            <input
              className={inputCls}
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="tap-target inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete || pending}
              className="tap-target inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
