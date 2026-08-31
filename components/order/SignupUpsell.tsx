"use client";

import { useState } from "react";
import { ChevronDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { convertGuestToAccount } from "@/lib/order-actions";
import { cn } from "@/lib/utils";

/**
 * Optional guest → account upsell. Collapsible (never a modal, never blocking):
 * a single password field converts the guest into a registered account.
 */
export function SignupUpsell({ orderRef }: { orderRef: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-sm font-extrabold text-primary">✓ Account created</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details are saved for faster checkout next time.
        </p>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await convertGuestToAccount({ ref: orderRef, password });
    setPending(false);
    if (res.ok) {
      setDone(true);
      toast.success("Account created.");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left"
      >
        <UserPlus className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-foreground">
            Save your details for faster checkout
          </span>
          <span className="block text-xs text-muted-foreground">
            Set a password — your name and phone are already saved. Optional.
          </span>
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 8 characters)"
            autoComplete="new-password"
            className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="submit"
            disabled={pending || password.length < 8}
            className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create account"}
          </button>
        </form>
      )}
    </section>
  );
}
