import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";

/**
 * Shared presentational primitives for the auth screens. No hooks — safe to
 * compose inside the client form components. Inputs reuse the exact checkout
 * field styling so auth matches the rest of the shop; errors are red per spec.
 */

/** Matches the checkout page's input styling verbatim (see CheckoutForm). */
export const authInputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  labelAside,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  /** Optional element on the right of the label row (e.g. "Forgot password?"). */
  labelAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="block text-xs font-bold text-foreground">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Form-level error banner (e.g. wrong password, rate limited). */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

/** Success screen: green check, heading, copy, and a single CTA link. */
export function AuthSuccess({
  title,
  children,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  children: React.ReactNode;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-6" strokeWidth={3} aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <Link
        href={ctaHref}
        className="tap-target mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

/** Warning screen (e.g. an invalid / expired reset link). */
export function AuthNotice({
  title,
  children,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  children: React.ReactNode;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <Link
        href={ctaHref}
        className="tap-target mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

/** The small cross-link line under a form ("New here? Create account"). */
export function AuthFootLink({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-center text-sm text-muted-foreground">{children}</p>;
}
