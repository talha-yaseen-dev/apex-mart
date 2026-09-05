"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerAction } from "@/lib/actions/auth";
import { AuthField, FormError, authInputCls } from "./AuthUI";
import { PasswordField } from "./PasswordField";
import { GoogleButton } from "./GoogleButton";
import { CheckEmail } from "./CheckEmail";

const BENEFITS = ["Faster checkout", "Track your orders", "Save delivery details"] as const;

export function RegisterForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterInput) => {
    setFormError(null);
    try {
      const res = await registerAction(data);
      if (res.ok) {
        // Enumeration-safe: always the neutral "check your email" screen.
        setSentTo(res.email ?? data.email);
        return;
      }
      if (res.field && res.field in data) {
        setError(res.field as keyof RegisterInput, { message: res.error });
      } else {
        setFormError(res.error);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  };

  if (sentTo) {
    return <CheckEmail email={sentTo} />;
  }

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

        {googleEnabled && (
          <div className="mt-6">
            <GoogleButton callbackUrl="/account" />
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={googleEnabled ? "space-y-4" : "mt-6 space-y-4"}
          noValidate
        >
          {formError && <FormError>{formError}</FormError>}

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="tap-target h-11 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating your account…" : "Create my account"}
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
