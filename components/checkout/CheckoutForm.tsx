"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/checkout-schema";
import { placeOrder } from "@/lib/checkout-actions";
import { useCart } from "@/components/cart/CartProvider";
import { formatPKR } from "@/lib/format";
import {
  DELIVERY_ZONES,
  DEFAULT_ZONE_ID,
  FREE_DELIVERY_THRESHOLD_MINOR,
  zoneById,
  STORE,
} from "@/lib/delivery-config";
import { cn } from "@/lib/utils";

const ZONE_STORAGE_KEY = "mart.zone";

type SavedAddress = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
};

export function CheckoutForm({
  savedAddresses = [],
  defaultContact,
}: {
  savedAddresses?: SavedAddress[];
  defaultContact?: { name?: string; phone?: string; email?: string };
}) {
  const { items, count, subtotalMinor, ready } = useCart();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof checkoutFormSchema>, unknown, CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: defaultContact?.name ?? "",
      phone: defaultContact?.phone ?? "",
      email: defaultContact?.email ?? "",
      street: "",
      area: "",
      city: STORE.city,
      zoneId: DEFAULT_ZONE_ID,
      riderNote: "",
      saveAddress: false,
      slot: "",
      payment: "cod",
      orderNote: "",
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fill the delivery fields from a saved address (from Account → Addresses).
  // City stays locked to the store city; area/zone aren't collected any more.
  function applyAddress(a: SavedAddress) {
    const opts = { shouldValidate: true, shouldDirty: true } as const;
    setValue("name", a.name, opts);
    setValue("street", a.line1, opts);
    if (defaultContact?.phone) setValue("phone", defaultContact.phone, opts);
    setSelectedId(a.id);
  }

  // Default the zone to the one chosen in the header, if any.
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem(ZONE_STORAGE_KEY);
    if (saved && DELIVERY_ZONES.some((z) => z.id === saved)) {
      setValue("zoneId", saved);
    }
  }, [setValue]);

  const zoneId = watch("zoneId");
  const deliveryFree = subtotalMinor >= FREE_DELIVERY_THRESHOLD_MINOR;
  const deliveryMinor = deliveryFree ? 0 : zoneById(zoneId).feeMinor;
  const totalMinor = subtotalMinor + deliveryMinor;

  const onSubmit = async (data: CheckoutFormInput) => {
    const res = await placeOrder(data);
    // On success placeOrder redirects (no return); a return means an error.
    if (res && !res.ok) {
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          setError(field as keyof CheckoutFormInput, { message });
        }
      }
      toast.error(res.error);
    }
  };

  if (ready && count === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 text-6xl">🛒</div>
        <h1 className="text-xl font-extrabold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add items before checking out.</p>
        <Link
          href="/c"
          className="tap-target mt-6 inline-flex items-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-7xl px-4 py-5 pb-28 md:pb-8"
    >
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Checkout</h1>
      <p className="mt-2 rounded-xl border border-primary/20 bg-primary-tint px-4 py-3 text-sm text-foreground">
        Class project demo: listed prices and availability are illustrative. Orders are recorded for demonstration and require store confirmation.
      </p>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-6">
          {/* Section 1 — Contact + Address */}
          <Section n={1} title="Contact & delivery address">
            {savedAddresses.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-foreground">Use a saved address</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedAddresses.map((a) => {
                    const active = selectedId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => applyAddress(a)}
                        aria-pressed={active}
                        className={cn(
                          "relative rounded-xl border p-3 pr-8 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-input bg-background hover:border-primary",
                        )}
                      >
                        {active && (
                          <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-white">
                            <Check className="size-3" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                        <div className="text-[13px] font-bold text-foreground">{a.label}</div>
                        <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                          {a.name} · {a.line1}, {a.city}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">Or enter a new address below.</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name?.message}>
                <input className={inputCls} placeholder="Ahmed Khan" {...register("name")} />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input
                  className={inputCls}
                  inputMode="tel"
                  placeholder="03001234567"
                  {...register("phone")}
                />
              </Field>
            </div>
            <Field label="Email (optional)" error={errors.email?.message}>
              <input
                className={inputCls}
                inputMode="email"
                placeholder="you@example.com"
                {...register("email")}
              />
            </Field>
            <Field label="Street / house address" error={errors.street?.message}>
              <input
                className={inputCls}
                placeholder="House 12, Street 4"
                {...register("street")}
              />
            </Field>
            <Field label="City">
              <input
                className={cn(inputCls, "cursor-not-allowed bg-muted/50 opacity-70")}
                readOnly
                title="Apex Tyres delivers within Sargodha only"
                {...register("city")}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <input type="checkbox" className="size-4 accent-primary" {...register("saveAddress")} />
              Save this address for next time
            </label>
            <p className="text-[11.5px] text-muted-foreground">
              Delivery {deliveryFree ? "is free" : `is ${formatPKR(deliveryMinor)}`} to{" "}
              {STORE.city} · 2-hour windows, 7 days a week.
            </p>
          </Section>

          {/* Section 2 — Payment */}
          <Section n={2} title="Payment">
            <label className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-4">
              <input type="radio" value="cod" defaultChecked className="size-4 accent-primary" {...register("payment")} />
              <span>
                <span className="block text-sm font-extrabold text-foreground">💵 Cash on Delivery</span>
                <span className="block text-xs text-muted-foreground">
                  Pay the rider in cash when your order arrives.
                </span>
              </span>
            </label>
            <Field label="Order note (optional)" error={errors.orderNote?.message}>
              <textarea
                className={cn(inputCls, "min-h-20 py-2")}
                placeholder="Anything else we should know?"
                {...register("orderNote")}
              />
            </Field>
          </Section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-[100px] lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-extrabold text-foreground">Order summary</h2>
            <ul className="mt-3 space-y-2">
              {items.map((it) => (
                <li key={it.itemId} className="flex justify-between gap-2 text-sm">
                  <span className="min-w-0 text-muted-foreground">
                    <span className="font-semibold text-foreground">{it.qty}×</span> {it.name}
                  </span>
                  <span className="shrink-0 font-semibold text-foreground">
                    {formatPKR(it.lineTotalMinor)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold text-foreground">{formatPKR(subtotalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-semibold text-foreground">
                  {deliveryFree ? <span className="text-primary">Free</span> : formatPKR(deliveryMinor)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-3">
                <dt className="text-base font-extrabold text-foreground">Total</dt>
                <dd className="text-base font-extrabold text-foreground">{formatPKR(totalMinor)}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={isSubmitting}
              className="tap-target mt-4 hidden w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 md:inline-flex"
            >
              {isSubmitting ? "Placing order…" : `Place order · ${formatPKR(totalMinor)}`}
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky mobile place-order bar */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground">Total</div>
            <div className="text-lg font-extrabold text-foreground">{formatPKR(totalMinor)}</div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="tap-target ml-auto inline-flex min-w-[160px] items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? "Placing…" : "Place order"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
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
