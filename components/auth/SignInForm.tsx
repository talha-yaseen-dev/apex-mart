"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { AUTH_ERRORS } from "@/lib/auth-constants";
import { signInErrorMessage } from "@/lib/auth-error-copy";
import {
  AuthCard,
  AuthField,
  AuthFootLink,
  FormError,
  SubmitButton,
  authInputCls,
} from "./AuthUI";
import { GoogleButton } from "./GoogleButton";

export function SignInForm({
  callbackUrl,
  initialError,
  googleEnabled = false,
  justVerified = false,
  justCreated = false,
}: {
  callbackUrl?: string;
  initialError?: string;
  googleEnabled?: boolean;
  justVerified?: boolean;
  justCreated?: boolean;
}) {
  const router = useRouter();
  // Customers land on the homepage after signing in. Honour an explicit
  // callbackUrl only when it points somewhere they meant to return to — never a
  // transactional page (an order/track/checkout link they hit while logged out
  // shouldn't strand them on that order after login).
  const dest =
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !/^\/(order|track|checkout)\b/.test(callbackUrl)
      ? callbackUrl
      : "/";
  const [errorCode, setErrorCode] = useState<string | null>(initialError ?? null);
  const [attemptedEmail, setAttemptedEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  // "Remember me" prefills the email on return visits. We deliberately never
  // store the password — the browser's own password manager (via
  // autoComplete="current-password") fills it securely.
  const REMEMBER_KEY = "apexmart:remember-email";
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setValue("email", saved);
        setRemember(true);
      }
    } catch {
      /* localStorage unavailable — no-op */
    }
  }, [setValue]);

  const onSubmit = async (data: SignInInput) => {
    setErrorCode(null);
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, data.email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore storage errors */
    }
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: dest,
    });
    if (!res || res.error) {
      setAttemptedEmail(data.email);
      setErrorCode(res?.error ?? "unknown");
      return;
    }
    const session = await getSession();
    router.push(session?.user?.isEmployee ? "/admin" : (res.url ?? dest));
    router.refresh();
  };

  const unverified = errorCode === AUTH_ERRORS.EMAIL_NOT_VERIFIED;

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Apex Mart.">
      {(justCreated || justVerified) && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
        >
          {justCreated
            ? "Account created successfully. Sign in to continue."
            : "Email verified — sign in to start shopping."}
        </div>
      )}

      {googleEnabled && (
        <div className="mb-5">
          <GoogleButton callbackUrl={dest} />
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errorCode && (
          <FormError>
            <span>{signInErrorMessage(errorCode)}</span>
            {unverified && (
              <Link
                href={`/verify-email?email=${encodeURIComponent(attemptedEmail)}`}
                className="mt-1 block font-bold underline underline-offset-2"
              >
                Enter your verification code →
              </Link>
            )}
          </FormError>
        )}

        <AuthField label="Email" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className={authInputCls}
            {...register("email")}
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          labelAside={
            <Link href="/forgot" className="text-xs font-bold text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${authInputCls} pr-11`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-pressed={showPw}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="tap-target absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </AuthField>

        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-primary"
          />
          Remember me
        </label>

        <SubmitButton pending={isSubmitting}>Sign in</SubmitButton>
      </form>

      <AuthFootLink>
        New to Apex Mart?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Create account
        </Link>
      </AuthFootLink>
    </AuthCard>
  );
}
