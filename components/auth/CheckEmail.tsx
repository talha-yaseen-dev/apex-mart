"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { maskEmail } from "@/lib/mask";
import { resendVerificationAction } from "@/lib/actions/auth";

const COOLDOWN = 60; // seconds — mirrors the server-side per-address cooldown

/**
 * Post-registration "check your email" screen. Shows the masked destination,
 * and a resend control that is disabled for a 60s cooldown. The cooldown is a
 * UX affordance only — the server independently rate-limits resends, so a
 * tampered client can't send faster.
 */
export function CheckEmail({ email }: { email: string }) {
  // A verification email was just sent by registerAction, so open on cooldown.
  const [seconds, setSeconds] = useState(COOLDOWN);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function resend() {
    if (seconds > 0 || status === "sending") return;
    setStatus("sending");
    try {
      const res = await resendVerificationAction({ email });
      if (res.ok) {
        setStatus("sent");
        setSeconds(COOLDOWN);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const disabled = seconds > 0 || status === "sending";

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">Check your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We sent a verification link to
        <br />
        <strong className="font-semibold text-foreground">{maskEmail(email)}</strong>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Open the link to activate your Apex Mart account. It expires in 24 hours.
      </p>

      <button
        type="button"
        onClick={resend}
        disabled={disabled}
        className="tap-target mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl border border-input bg-background text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending"
          ? "Sending…"
          : seconds > 0
            ? `Resend in ${seconds}s`
            : "Resend verification email"}
      </button>

      <p aria-live="polite" className="mt-2 min-h-4 text-xs text-muted-foreground">
        {status === "sent" && "If that address needs a link, a new one is on its way."}
        {status === "error" && "Couldn’t resend just now — please try again in a moment."}
      </p>

      <p className="mt-4 text-sm text-muted-foreground">
        Wrong address?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Start over
        </Link>{" "}
        or{" "}
        <Link href="/signin" className="font-bold text-primary hover:underline">
          sign in
        </Link>
        .
      </p>
    </div>
  );
}
