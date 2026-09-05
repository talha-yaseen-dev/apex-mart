"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { AUTH_ERRORS } from "@/lib/auth-constants";
import { signInErrorMessage } from "@/lib/auth-error-copy";
import { resendVerificationAction } from "@/lib/actions/auth";
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
}: {
  callbackUrl?: string;
  initialError?: string;
  googleEnabled?: boolean;
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
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInInput) => {
    setErrorCode(null);
    setResendState("idle");
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: dest,
    });
    if (!res || res.error) {
      setErrorCode(res?.error ?? "unknown");
      return;
    }
    const session = await getSession();
    router.push(session?.user?.isEmployee ? "/admin" : (res.url ?? dest));
    router.refresh();
  };

  const unverified = errorCode === AUTH_ERRORS.EMAIL_NOT_VERIFIED;

  async function resend() {
    const email = getValues("email");
    if (!email || resendState === "sending") return;
    setResendState("sending");
    try {
      await resendVerificationAction({ email });
    } finally {
      setResendState("sent");
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Apex Mart.">
      {googleEnabled && (
        <div className="mb-5">
          <GoogleButton callbackUrl={dest} />
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errorCode && (
          <FormError>
            <span>{signInErrorMessage(errorCode)}</span>
            {unverified && (
              <button
                type="button"
                onClick={resend}
                disabled={resendState !== "idle"}
                className="mt-1 block font-bold underline underline-offset-2 disabled:no-underline disabled:opacity-70"
              >
                {resendState === "idle"
                  ? "Resend verification email"
                  : resendState === "sending"
                    ? "Sending…"
                    : "Verification email sent — check your inbox."}
              </button>
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
