"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send, Loader2, AlertCircle } from "lucide-react";
import { requestReturnAction } from "@/lib/actions/returns";
import { RETURN_REASONS, MAX_RETURN_NOTE } from "@/lib/return-reasons";
import { STORE } from "@/lib/delivery-config";
import { cn } from "@/lib/utils";

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function ReturnForm({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const over = note.length > MAX_RETURN_NOTE;

  const autogrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reason) return setError("Please choose a reason.");
    if (over) return setError(`Please keep the note under ${MAX_RETURN_NOTE} characters.`);

    setLoading(true);
    const res = await requestReturnAction(orderId, { reason, note });
    setLoading(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  };

  if (done) {
    const reasonText =
      RETURN_REASONS.find((r) => r.value === reason)?.label ?? reason;
    const waHref = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
      `Hi, I need help with order ${orderNumber}. Reason: ${reasonText}.`,
    )}`;
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h2 className="mt-3 text-lg font-extrabold text-foreground">Request received</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          We&apos;ve received your request. The store will review it and contact you.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Or contact us directly:{" "}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            message us on WhatsApp
          </a>
          .
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/account/orders/${orderId}`}
            className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
          >
            Back to order
          </Link>
          <Link
            href="/account/orders"
            className="tap-target inline-flex items-center justify-center rounded-xl border border-input px-5 text-sm font-bold text-foreground hover:bg-muted"
          >
            View all orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5" noValidate>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="reason" className="mb-1.5 block text-xs font-bold text-foreground">
          What went wrong? <span className="text-red-600">*</span>
        </label>
        <select
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn(inputCls, "appearance-none")}
        >
          <option value="" disabled>
            Select a reason…
          </option>
          {RETURN_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="note" className="mb-1.5 block text-xs font-bold text-foreground">
          Add a note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="note"
          ref={taRef}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            autogrow();
          }}
          rows={3}
          placeholder="Tell us a bit more so we can help faster."
          className={cn(inputCls, "min-h-24 resize-none py-2.5 leading-relaxed")}
        />
        <p
          className={cn(
            "mt-1 text-right text-xs",
            over ? "font-bold text-red-600" : "text-muted-foreground",
          )}
        >
          {note.length} / {MAX_RETURN_NOTE}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || over}
        className="tap-target mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden />
            Submit request
          </>
        )}
      </button>
    </form>
  );
}
