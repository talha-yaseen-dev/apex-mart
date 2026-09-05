"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Address } from "@prisma/client";
import { saveAddressAction } from "@/lib/actions/addresses";
import { STORE } from "@/lib/delivery-config";
import { cn } from "@/lib/utils";

// Mirrors Nova's server-side schema in lib/actions/addresses.ts exactly —
// label/name/line1/city/region/postalCode all required, line2 optional,
// country a 2-letter code. (Nova requires region + postalCode, so the form
// does too, even though they read as "optional" fields elsewhere.)
const schema = z.object({
  label: z.string().trim().min(1, "Add a label like Home or Office."),
  name: z.string().trim().min(1, "Recipient name is required."),
  line1: z.string().trim().min(1, "Street / house address is required."),
  line2: z.string().trim().optional().default(""),
  city: z.string().trim().min(1, "City is required."),
  region: z.string().trim().min(1, "Province / region is required."),
  postalCode: z.string().trim().min(1, "Postal code is required."),
  country: z.string().trim().min(2, "Country is required."),
  isDefault: z.boolean().default(false),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function AddressForm({
  initial,
  defaultIsDefault = false,
  onSuccess,
}: {
  initial?: Address;
  defaultIsDefault?: boolean;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: initial?.label ?? "",
      name: initial?.name ?? "",
      line1: initial?.line1 ?? "",
      line2: initial?.line2 ?? "",
      // Apex Mart delivers within Sargodha only — city/region/country are fixed.
      city: initial?.city ?? STORE.city,
      region: initial?.region ?? STORE.region,
      postalCode: initial?.postalCode ?? "",
      country: initial?.country ?? "PK",
      isDefault: initial?.isDefault ?? defaultIsDefault,
    },
  });

  const onSubmit = async (data: FormOutput) => {
    const res = await saveAddressAction({ ...data, id: initial?.id });
    if (res.ok) {
      toast.success(initial ? "Address updated" : "Address added");
      onSuccess();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Label" error={errors.label?.message}>
        <input className={inputCls} placeholder="Home" {...register("label")} />
      </Field>
      <Field label="Recipient name" error={errors.name?.message}>
        <input className={inputCls} placeholder="Ahmed Khan" {...register("name")} />
      </Field>
      <Field label="Street / house address" error={errors.line1?.message}>
        <input className={inputCls} placeholder="House 12, Street 4" {...register("line1")} />
      </Field>
      <Field label="Apartment, suite, etc. (optional)" error={errors.line2?.message}>
        <input className={inputCls} placeholder="Flat 2B" {...register("line2")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <input
            className={cn(inputCls, "cursor-not-allowed bg-muted/50 opacity-70")}
            readOnly
            title="Apex Mart delivers within Sargodha only"
            {...register("city")}
          />
        </Field>
        <Field label="Postal code" error={errors.postalCode?.message}>
          <input className={inputCls} inputMode="numeric" placeholder="40100" {...register("postalCode")} />
        </Field>
      </div>
      {/* Region + country are fixed for this single-city store. */}
      <input type="hidden" {...register("region")} />
      <input type="hidden" {...register("country")} />

      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <input type="checkbox" className="size-4 accent-primary" {...register("isDefault")} />
        Set as default address
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="tap-target mt-1 inline-flex w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add address"}
      </button>
    </form>
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
      <label className={cn("mb-1.5 block text-xs font-bold text-foreground")}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
