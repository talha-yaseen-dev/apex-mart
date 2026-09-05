"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { maskEmail } from "@/lib/mask";
import { verifyEmailCodeAction, resendVerificationAction } from "@/lib/actions/auth";
import { OtpInput } from "./OtpInput";

const COOLDOWN = 60; // seconds — mirrors the server-side per-address resend cooldown

/**
 * OTP verification screen for account email verification. Used two ways:
 *   - Post-registration (`justSent`): a code was just emailed, resend on cooldown.
 *   - Standalone /verify-email?email=… : the user asks for a code first.
 *
 * All checks are server-side (verifyEmailCodeAction). On success we route to
 * sign-in with a success flag; the code is never placed in the URL.
 */
export function VerifyEmailForm({ email, justSent = false }: { email: string; justSent?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(justSent ? COOLDOWN : 0);
  const [resending, setResending] = useState(false);
  const [sentOnce, setSentOnce] = useState(justSent);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function submit(codeToUse: string) {
    if (submitting || codeToUse.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await verifyEmailCodeAction({ email, code: codeToUse });
      if (res.ok) {
        router.push("/signin?verified=1");
        return;
      }
      setError(res.error);
      setCode("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await resendVerificationAction({ email });
      setSentOnce(true);
      setSeconds(COOLDOWN);
    } catch {
      setError("Couldn’t send a code just now — please try again in a moment.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">Verify your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {sentOnce ? "We sent a 6-digit code to" : "We’ll send a 6-digit code to"}
        <br />
        <strong className="font-semibold text-foreground">{maskEmail(email)}</strong>
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          onComplete={(c) => void submit(c)}
          disabled={submitting}
          autoFocus={sentOnce}
          ariaInvalid={Boolean(error)}
        />

        <p aria-live="assertive" className="mt-3 min-h-5 text-sm font-medium text-red-600">
          {error}
        </p>

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="tap-target mt-1 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="mt-5 text-sm text-muted-foreground">
        {sentOnce ? "Didn’t receive it?" : "Ready when you are."}{" "}
        <button
          type="button"
          onClick={resend}
          disabled={seconds > 0 || resending}
          className="font-bold text-primary underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
        >
          {resending
            ? "Sending…"
            : seconds > 0
              ? `Resend code in ${seconds}s`
              : sentOnce
                ? "Resend code"
                : "Send code"}
        </button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Wrong address?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Start over
        </Link>
      </p>
    </div>
  );
}
