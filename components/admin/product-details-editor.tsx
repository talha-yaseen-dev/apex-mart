"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductAction } from "@/lib/actions/admin";
import { ImageUploader } from "./image-uploader";

const inputCls =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-[12px] font-semibold text-muted-foreground";

type Category = { id: string; name: string };

export function ProductDetailsEditor({
  product,
}: {
  product: {
    id: string;
    name: string;
    brand: string | null;
    categoryId: string;
    categories: Category[];
    images: string[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [images, setImages] = useState<string[]>(product.images);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    name.trim() !== product.name ||
    brand.trim() !== (product.brand ?? "") ||
    categoryId !== product.categoryId ||
    JSON.stringify(images) !== JSON.stringify(product.images);

  async function save() {
    setMsg(null);
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Enter a product name." });
    setPending(true);
    const res = await updateProductAction({
      id: product.id,
      name: name.trim(),
      brand: brand.trim() || undefined,
      categoryId,
      images: images.map((s) => s.trim()).filter(Boolean),
    });
    setPending(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Changes saved." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-bold">Details</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Product name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Brand (optional)</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Manufacturer name"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {product.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelCls}>Images</label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="h-10 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {msg && (
          <span
            className={
              msg.ok ? "text-[12.5px] text-[oklch(0.45_0.1_150)]" : "text-[12.5px] text-destructive"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
}
