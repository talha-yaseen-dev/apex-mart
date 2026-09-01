"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotSchema, type ForgotInput } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/actions/auth";
import {
  AuthCard,
  AuthField,
  AuthFootLink,
  AuthSuccess,
  SubmitButton,
  authInputCls,
} from "./AuthUI";

export function ForgotForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotInput) => {
    const res = await forgotPasswordAction({ email: data.email });
    // Always neutral on success — never reveals whether the email is registered.
    if (res.ok) setSent(true);
    else setError("email", { message: res.error });
  };

  if (sent) {
    return (
      <AuthSuccess title="Check your email" ctaHref="/signin" ctaLabel="Back to sign in">
        If an account exists for that address, you&apos;ll receive a reset link shortly.
      </AuthSuccess>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send a link."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

        <SubmitButton pending={isSubmitting}>Send reset link</SubmitButton>
      </form>

      <AuthFootLink>
        Remembered it?{" "}
        <Link href="/signin" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </AuthFootLink>
    </AuthCard>
  );
}
