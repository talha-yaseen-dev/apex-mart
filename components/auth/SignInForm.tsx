"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { AUTH_ERRORS } from "@/lib/auth-constants";
import {
  AuthCard,
  AuthField,
  AuthFootLink,
  FormError,
  SubmitButton,
  authInputCls,
} from "./AuthUI";

/** Maps NextAuth error codes (thrown in authorize / "CredentialsSignin") to
 *  human copy. Bad credentials stay deliberately vague (no user enumeration). */
const ERROR_COPY: Record<string, string> = {
  [AUTH_ERRORS.RATE_LIMITED]: "Too many attempts. Please wait a moment and try again.",
  [AUTH_ERRORS.EMAIL_NOT_VERIFIED]:
    "Please verify your email first — check your inbox for the link.",
  [AUTH_ERRORS.DEACTIVATED]:
    "This account has been deactivated. Contact us if you think this is a mistake.",
  CredentialsSignin: "Incorrect email or password.",
};
const messageFor = (code?: string | null) =>
  (code && ERROR_COPY[code]) || "Something went wrong. Please try again.";

export function SignInForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const dest = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/account";
  const [formError, setFormError] = useState<string | null>(
    initialError ? messageFor(initialError) : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInInput) => {
    setFormError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: dest,
    });
    if (!res || res.error) {
      setFormError(messageFor(res?.error));
      return;
    }
    router.push(res.url ?? dest);
    router.refresh();
  };

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to Mart Shop.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <FormError>{formError}</FormError>}

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
            <Link
              href="/forgot"
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={authInputCls}
            {...register("password")}
          />
        </AuthField>

        <SubmitButton pending={isSubmitting}>Sign in</SubmitButton>
      </form>

      <AuthFootLink>
        New to Mart Shop?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Create account
        </Link>
      </AuthFootLink>
    </AuthCard>
  );
}
