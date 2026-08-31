"use client";

import { useState } from "react";
import { ChevronDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { convertGuestToAccount } from "@/lib/order-actions";
import { cn } from "@/lib/utils";

/**
 * Optional guest → account upsell. Collapsible, never blocking. Collects a
 * password plus a real login email — pre-filled read-only when the checkout
 * captured one, or a required input otherwise.
 */
export function SignupUpsell({
  orderRef,
  presetEmail,
}: {
  orderRef: string;
  presetEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  if (savedEmail) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-sm font-extrabold text-primary">✓ Account created</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in next time with <span className="font-semibold">{savedEmail}</span>.
        </p>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await convertGuestToAccount({
      ref: orderRef,
      email: presetEmail ?? email,
      password,
    });
    setPending(false);
    if (res.ok) {
      setSavedEmail(res.email);
      toast.success("Account created.");
    } else {
      toast.error(res.error);
    }
  };

  const emailOk = presetEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = !pending && password.length >= 8 && emailOk;

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
        <form onSubmit={submit} className="flex flex-col gap-3 border-t border-border p-5">
          {presetEmail ? (
            <p className="text-xs text-muted-foreground">
              You&apos;ll sign in with{" "}
              <span className="font-semibold text-foreground">{presetEmail}</span>
            </p>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
              className={inputCls}
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 8 characters)"
            autoComplete="new-password"
            required
            className={inputCls}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Create account"}
          </button>
        </form>
      )}
    </section>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
