"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { strongPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth";
import {
  AuthCard,
  AuthField,
  AuthNotice,
  AuthSuccess,
  FormError,
  SubmitButton,
  authInputCls,
} from "./AuthUI";

const resetFormSchema = z
  .object({
    password: strongPasswordSchema,
    confirm: z.string().min(1, "Re-enter your password."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
type ResetFormInput = z.infer<typeof resetFormSchema>;

const PASSWORD_HINT = "8+ characters, with a capital letter, a number and a symbol.";

/** The reset action returns this exact copy when the token is bad/consumed. */
const INVALID_TOKEN_ERROR = "This link is invalid or has expired.";

export function ResetForm({ token }: { token?: string }) {
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: ResetFormInput) => {
    setFormError(null);
    const res = await resetPasswordAction({
      token: token ?? "",
      password: data.password,
      confirm: data.confirm,
    });
    if (res.ok) {
      setDone(true);
      return;
    }
    if (res.error === INVALID_TOKEN_ERROR) {
      setInvalid(true);
    } else if (res.field === "password" || res.field === "confirm") {
      setError(res.field, { message: res.error });
    } else {
      // e.g. pwned-password rejection or a locked demo account.
      setFormError(res.error);
    }
  };

  if (invalid) {
    return (
      <AuthNotice title="This reset link is invalid or expired" ctaHref="/forgot" ctaLabel="Request a new one">
        Reset links can only be used once and expire after a short while. Request a new one to continue.
      </AuthNotice>
    );
  }

  if (done) {
    return (
      <AuthSuccess title="Password updated" ctaHref="/signin" ctaLabel="Go to sign in">
        You can now sign in with your new password.
      </AuthSuccess>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <FormError>{formError}</FormError>}

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
            autoFocus
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

        <SubmitButton pending={isSubmitting}>Reset password</SubmitButton>
      </form>
    </AuthCard>
  );
}
