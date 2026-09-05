"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { maskEmail } from "@/lib/mask";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { sendRegistrationCodeAction, createAccountAction } from "@/lib/actions/auth";
import { AuthField, FormError, authInputCls } from "./AuthUI";
import { PasswordField } from "./PasswordField";
import { OtpInput } from "./OtpInput";

const BENEFITS = ["Faster checkout", "Track your orders", "Save delivery details"] as const;
const COOLDOWN = 60;
const normalize = (e: string) => e.trim().toLowerCase();

/**
 * Two-step registration on ONE screen. Step 1 ("Send verification code") issues
 * a code but creates NO account. Step 2 ("Create account") is only enabled once
 * 6 digits are entered and creates the verified account server-side, then sends
 * the user to /signin. Editing the email after a code was sent resets the code
 * step so a code for email A can never create an account for email B.
 */
export function RegisterForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "code">("form");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const emailValue = watch("email");

  // Resend cooldown countdown.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // Editing the email after a code was sent invalidates the code step entirely.
  useEffect(() => {
    if (phase === "code" && sentEmail && normalize(emailValue) !== sentEmail) {
      setPhase("form");
      setSentEmail(null);
      setCode("");
      setSeconds(0);
      setActionError(null);
    }
  }, [emailValue, phase, sentEmail]);

  function applyResult(
    res: { ok: false; error: string; field?: string },
    data: RegisterInput,
  ) {
    if (res.field && res.field !== "code" && res.field in data) {
      setError(res.field as keyof RegisterInput, { message: res.error });
    } else {
      setActionError(res.error);
    }
  }

  async function sendCode(data: RegisterInput) {
    setActionError(null);
    setSending(true);
    try {
      const res = await sendRegistrationCodeAction({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      if (res.ok) {
        setSentEmail(normalize(data.email));
        setPhase("code");
        setCode("");
        setSeconds(COOLDOWN);
      } else {
        applyResult(res, data);
      }
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function createAccount(data: RegisterInput) {
    if (code.length !== 6 || creating) return;
    setActionError(null);
    setCreating(true);
    try {
      const res = await createAccountAction({
        name: data.name,
        email: data.email,
        password: data.password,
        code,
      });
      if (res.ok) {
        router.push("/signin?created=1");
        return;
      }
      if (res.field === "code") setCode("");
      applyResult(res, data);
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function resend() {
    if (seconds > 0 || sending || !sentEmail) return;
    setActionError(null);
    setSending(true);
    try {
      const res = await sendRegistrationCodeAction({
        name: watch("name"),
        email: sentEmail,
        password: watch("password"),
      });
      if (res.ok) {
        setCode("");
        setSeconds(COOLDOWN);
      } else {
        setActionError(res.error);
      }
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const inCode = phase === "code";
  const onSubmit = handleSubmit((data) => (inCode ? createAccount(data) : sendCode(data)));

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-2">
      {/* Left — restrained marketing panel (desktop only). */}
      <aside className="hidden flex-col justify-center gap-7 border-r border-border bg-muted/40 p-10 md:flex">
        <div className="flex items-center gap-2">
          <BrandMark size={30} />
          <span className="text-lg font-extrabold tracking-tight text-foreground">Apex Mart</span>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Shop faster with Apex Mart
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Create a free account to breeze through checkout and keep every order in one place.
          </p>
        </div>
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm font-medium text-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-3" strokeWidth={3.5} aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </aside>

      {/* Right — the form. */}
      <div className="p-6 sm:p-8 lg:p-10">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start shopping in seconds.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {actionError && <FormError>{actionError}</FormError>}

          <AuthField label="Full name" htmlFor="name" error={errors.name?.message}>
            <input
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Ahmed Khan"
              className={authInputCls}
              {...register("name")}
            />
          </AuthField>

          <AuthField label="Email" htmlFor="email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={authInputCls}
              {...register("email")}
            />
          </AuthField>

          <PasswordField
            value={watch("password")}
            error={errors.password?.message}
            registration={register("password")}
          />

          {inCode && sentEmail && (
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to{" "}
                <strong className="font-semibold text-foreground">{maskEmail(sentEmail)}</strong>
              </p>
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-bold text-foreground">Verification code</label>
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (actionError) setActionError(null);
                  }}
                  disabled={creating}
                  autoFocus
                  ariaInvalid={Boolean(actionError)}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Code expires in 10 minutes.</span>
                <button
                  type="button"
                  onClick={resend}
                  disabled={seconds > 0 || sending}
                  className="font-bold text-primary underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
                >
                  {sending ? "Sending…" : seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || creating || (inCode && code.length !== 6)}
            className="tap-target h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inCode
              ? creating
                ? "Creating account…"
                : "Create account"
              : sending
                ? "Sending code…"
                : "Send verification code"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="font-bold text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
