"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateProfileAction, changePasswordAction } from "@/lib/actions/profile";

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

// ── Account section ───────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
  phone: z.string().trim().optional().default(""),
});
type ProfileInput = z.input<typeof profileSchema>;
type ProfileOutput = z.output<typeof profileSchema>;

export function ProfileForm({
  name,
  phone,
  email,
}: {
  name: string;
  phone: string;
  email: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });

  const onSubmit = async (data: ProfileOutput) => {
    const res = await updateProfileAction({ name: data.name, phone: data.phone });
    if (res.ok) {
      toast.success("Saved");
      router.refresh(); // re-render layout so the sidebar name updates
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Section title="Account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" error={errors.name?.message}>
          <input className={inputCls} placeholder="Ahmed Khan" {...register("name")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input
            className={inputCls}
            inputMode="tel"
            placeholder="03001234567"
            autoComplete="tel"
            {...register("phone")}
          />
        </Field>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-foreground">Email</label>
          <input className={`${inputCls} cursor-not-allowed opacity-60`} value={email} readOnly disabled />
          <p className="mt-1 text-xs text-muted-foreground">To change your email, contact support.</p>
        </div>
        <SaveButton pending={isSubmitting}>Save changes</SaveButton>
      </form>
    </Section>
  );
}

// ── Security section ──────────────────────────────────────────
const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Re-enter the new password."),
  })
  .refine((v) => v.next === v.confirm, {
    message: "New passwords don’t match.",
    path: ["confirm"],
  });
type PasswordFields = z.infer<typeof passwordSchema>;

export function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const onSubmit = async (data: PasswordFields) => {
    const res = await changePasswordAction(data);
    if (res.ok) {
      toast.success("Password changed");
      reset();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Section title="Security">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Current password" error={errors.current?.message}>
          <input
            type="password"
            autoComplete="current-password"
            className={inputCls}
            {...register("current")}
          />
        </Field>
        <Field label="New password" error={errors.next?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            {...register("next")}
          />
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            {...register("confirm")}
          />
        </Field>
        <SaveButton pending={isSubmitting}>Change password</SaveButton>
      </form>
    </Section>
  );
}

// ── Shared bits ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-extrabold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function SaveButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
