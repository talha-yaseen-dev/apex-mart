"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVariantAction } from "@/lib/actions/admin";

type Variant = {
  id: string;
  sku: string;
  label: string;
  priceMinor: number;
  stock: number;
};

export function VariantEditor({
  variants,
  canEdit = true,
}: {
  variants: Variant[];
  // Editing here sets the variant price — a manager/admin capability. Without it
  // the variants render read-only (staff change stock via the Inventory flow).
  canEdit?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3 text-sm font-bold">Variants</div>

      {/* Mobile: stacked cards so every field fits on a phone screen. */}
      <div className="space-y-3 p-3 sm:hidden">
        {variants.map((v) =>
          canEdit ? (
            <VariantCard key={v.id} variant={v} />
          ) : (
            <ReadOnlyCard key={v.id} variant={v} />
          ),
        )}
      </div>

      {/* Desktop: table with horizontal scroll fallback for narrow tablets. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Variant</th>
              <th className="px-4 py-2.5 font-semibold">SKU</th>
              <th className="px-4 py-2.5 font-semibold">Price (PKR)</th>
              <th className="px-4 py-2.5 font-semibold">Stock</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) =>
              canEdit ? <Row key={v.id} variant={v} /> : <ReadOnlyRow key={v.id} variant={v} />,
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const fmtPrice = (priceMinor: number) => (priceMinor / 100).toFixed(2);

function ReadOnlyRow({ variant }: { variant: Variant }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2.5 font-medium">{variant.label || "Default"}</td>
      <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">{variant.sku}</td>
      <td className="px-4 py-2.5 tabular-nums">{fmtPrice(variant.priceMinor)}</td>
      <td className="px-4 py-2.5 tabular-nums">{variant.stock}</td>
      <td className="px-4 py-2.5" />
    </tr>
  );
}

function ReadOnlyCard({ variant }: { variant: Variant }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-baseline gap-2">
        <span className="font-medium">{variant.label || "Default"}</span>
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">{variant.sku}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <span className={cardLabelCls}>Price (PKR)</span>
          <div className="tabular-nums">{fmtPrice(variant.priceMinor)}</div>
        </div>
        <div>
          <span className={cardLabelCls}>Stock</span>
          <div className="tabular-nums">{variant.stock}</div>
        </div>
      </div>
    </div>
  );
}

function useVariantEdit(variant: Variant) {
  const router = useRouter();
  const [price, setPrice] = useState((variant.priceMinor / 100).toFixed(2));
  const [stock, setStock] = useState(String(variant.stock));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const dirty =
    Math.round(parseFloat(price || "0") * 100) !== variant.priceMinor ||
    parseInt(stock || "0", 10) !== variant.stock;

  function save() {
    start(async () => {
      await updateVariantAction(variant.id, {
        priceMinor: Math.round(parseFloat(price || "0") * 100),
        stock: parseInt(stock || "0", 10),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return { price, setPrice, stock, setStock, pending, saved, dirty, save };
}

const priceCls =
  "h-8 w-24 rounded-md border bg-card px-2 text-[13px] focus:border-primary focus:outline-none";
const stockCls =
  "h-8 w-20 rounded-md border bg-card px-2 text-[13px] focus:border-primary focus:outline-none";
const rowSaveCls =
  "h-8 rounded-md bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-40";
const cardFieldCls =
  "h-10 w-full rounded-md border bg-card px-2.5 text-sm focus:border-primary focus:outline-none";
const cardLabelCls =
  "mb-1 block text-[10.5px] uppercase tracking-wide text-muted-foreground";

function Row({ variant }: { variant: Variant }) {
  const { price, setPrice, stock, setStock, pending, saved, dirty, save } =
    useVariantEdit(variant);

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2.5 font-medium">{variant.label || "Default"}</td>
      <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">{variant.sku}</td>
      <td className="px-4 py-2.5">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          className={priceCls}
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          className={stockCls}
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <button disabled={!dirty || pending} onClick={save} className={rowSaveCls}>
          {pending ? "…" : saved ? "Saved ✓" : "Save"}
        </button>
      </td>
    </tr>
  );
}

function VariantCard({ variant }: { variant: Variant }) {
  const { price, setPrice, stock, setStock, pending, saved, dirty, save } =
    useVariantEdit(variant);

  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-baseline gap-2">
        <span className="font-medium">{variant.label || "Default"}</span>
        <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
          {variant.sku}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className={cardLabelCls}>Price (PKR)</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className={cardFieldCls}
          />
        </label>
        <label className="block">
          <span className={cardLabelCls}>Stock</span>
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className={cardFieldCls}
          />
        </label>
      </div>
      <button
        disabled={!dirty || pending}
        onClick={save}
        className="mt-3 h-10 w-full rounded-md bg-primary px-3 text-[13px] font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
