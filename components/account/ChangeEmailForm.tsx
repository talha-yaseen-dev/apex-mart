"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { maskEmail } from "@/lib/mask";
import { startEmailChangeAction, verifyEmailChangeAction } from "@/lib/actions/email-change";
import { OtpInput } from "@/components/auth/OtpInput";

const COOLDOWN = 60;
const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * Settings → change email. Identical for CUSTOMER and ADMIN. Two steps:
 *   1. Enter the new email (+ current password for reauthentication) → a code is
 *      sent to the NEW address. The account email does NOT change yet.
 *   2. Enter the 6-digit code → the server flips the account email + marks it
 *      verified. Role is never touched.
 *
 * Password-less (Google) accounts can't change email here until they set a
 * password — the server enforces this; the UI just explains it.
 */
export function ChangeEmailForm({
  currentEmail,
  hasPassword,
}: {
  currentEmail: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "form" | "code">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState(""); // held in memory only for reauth + resend
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function resetAll() {
    setStep("idle");
    setNewEmail("");
    setPassword("");
    setCode("");
    setError(null);
    setSeconds(0);
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startEmailChangeAction({ newEmail, currentPassword: password });
      if (res.ok) {
        setStep("code");
        setCode("");
        setSeconds(COOLDOWN);
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(codeToUse: string) {
    if (busy || codeToUse.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyEmailChangeAction({ newEmail, code: codeToUse });
      if (res.ok) {
        toast.success("Email updated");
        resetAll();
        router.refresh();
      } else {
        setError(res.error);
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startEmailChangeAction({ newEmail, currentPassword: password });
      if (res.ok) setSeconds(COOLDOWN);
      else setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-extrabold text-foreground">Email</h2>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-bold text-foreground">Current email</label>
        <input className={`${inputCls} cursor-not-allowed opacity-60`} value={currentEmail} readOnly disabled />
      </div>

      {!hasPassword ? (
        <p className="text-sm text-muted-foreground">
          You sign in with Google, so this account has no password yet. Set a password in the
          Security section below to be able to change your email.
        </p>
      ) : step === "idle" ? (
        <button
          type="button"
          onClick={() => setStep("form")}
          className="tap-target inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 text-sm font-bold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Change email
        </button>
      ) : step === "form" ? (
        <form onSubmit={start} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">New email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputCls}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Confirming your password protects your account’s recovery email.
            </p>
          </div>
          {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="tap-target inline-flex items-center justify-center rounded-xl px-4 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to{" "}
            <strong className="font-semibold text-foreground">{maskEmail(newEmail)}</strong>. Your
            current email stays active until you confirm.
          </p>
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            onComplete={(c) => void verify(c)}
            disabled={busy}
            autoFocus
            ariaInvalid={Boolean(error)}
          />
          {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void verify(code)}
              disabled={busy || code.length !== 6}
              className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Confirm new email"}
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={seconds > 0 || busy}
              className="text-sm font-bold text-primary underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
            >
              {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="ml-auto text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
