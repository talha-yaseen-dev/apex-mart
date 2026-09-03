"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProductAction } from "@/lib/actions/admin";
import { ImageUploader } from "./image-uploader";

type Category = { id: string; name: string };

const inputCls =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-[12px] font-semibold text-muted-foreground";

export function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setBrand("");
    setPrice("");
    setStock("");
    setSku("");
    setImages([]);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceMinor = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(priceMinor)) return setError("Enter a valid price.");
    const stockNum = parseInt(stock || "0", 10);

    setPending(true);
    const res = await createProductAction({
      name,
      categoryId,
      brand: brand.trim() || undefined,
      priceMinor,
      stock: Number.isFinite(stockNum) ? stockNum : 0,
      sku: sku.trim() || undefined,
      images: images.map((s) => s.trim()).filter(Boolean),
    });
    setPending(false);

    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  function close() {
    setOpen(false);
    setError("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover"
      >
        <Plus className="size-4" />
        Add product
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-float sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center">
              <h2 className="font-display text-lg font-bold">Add a product</h2>
              <button
                onClick={close}
                aria-label="Cancel"
                className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2">
          <label className={labelCls}>Product name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vortex Pro Gaming Mouse"
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Brand (optional)</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Samsung, Apple"
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>SKU (optional)</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            placeholder="auto"
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Price (USD)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="59.99"
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Stock</label>
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="50"
            className={inputCls}
          />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className={labelCls}>Product images (optional)</label>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
          <button
            type="submit"
            disabled={pending || !name || !price || !categoryId}
            className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create product"}
          </button>
          {error && <span className="text-[12.5px] text-destructive">{error}</span>}
        </div>
      </form>
          </div>
        </div>
      )}
    </>
  );
}
