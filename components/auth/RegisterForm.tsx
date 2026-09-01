"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations/auth";
import { registerAction } from "@/lib/actions/auth";
import {
  AuthCard,
  AuthField,
  AuthFootLink,
  AuthSuccess,
  FormError,
  SubmitButton,
  authInputCls,
} from "./AuthUI";

// Confirm-password is a client-only concern (registerAction takes name/email/
// password); we drop `confirm` before calling the server action.
const registerFormSchema = registerSchema
  .extend({ confirm: z.string().min(1, "Re-enter your password.") })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
type RegisterFormInput = z.infer<typeof registerFormSchema>;

const PASSWORD_HINT = "8+ characters, with a capital letter, a number and a symbol.";

export function RegisterForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = async (data: RegisterFormInput) => {
    setFormError(null);
    const res = await registerAction({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    if (res.ok) {
      // Enumeration-safe: always the neutral "check your email" screen.
      setSentTo(res.email ?? data.email);
      return;
    }
    if (res.field && res.field in data) {
      setError(res.field as keyof RegisterFormInput, { message: res.error });
    } else {
      setFormError(res.error);
    }
  };

  if (sentTo) {
    return (
      <AuthSuccess title="Check your email" ctaHref="/signin" ctaLabel="Back to sign in">
        We&apos;ve sent a verification link to <strong className="text-foreground">{sentTo}</strong>.
        Click it to activate your account, then sign in.
      </AuthSuccess>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="Join Mart Shop — it only takes a minute.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <FormError>{formError}</FormError>}

        <AuthField label="Name" htmlFor="name" error={errors.name?.message}>
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

        <AuthField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint={PASSWORD_HINT}
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={authInputCls}
            {...register("password")}
          />
        </AuthField>

        <AuthField label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={authInputCls}
            {...register("confirm")}
          />
        </AuthField>

        <SubmitButton pending={isSubmitting}>Create account</SubmitButton>
      </form>

      <AuthFootLink>
        Already have an account?{" "}
        <Link href="/signin" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </AuthFootLink>
    </AuthCard>
  );
}
