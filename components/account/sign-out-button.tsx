"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Sign out with a confirmation step. Reused across the account nav (mobile pills
 * + sidebar) and the admin sidebar — pass `className`/`children` to match the
 * host's styling; the confirmation dialog is identical everywhere.
 */
export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "h-9 rounded-lg border bg-card px-3 text-[12.5px] font-semibold text-foreground/80 hover:border-primary"
        }
      >
        {children ?? "Sign out"}
      </button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You’ll need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="tap-target inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(true);
                void signOut({ callbackUrl: "/" });
              }}
              disabled={pending}
              className="tap-target inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
