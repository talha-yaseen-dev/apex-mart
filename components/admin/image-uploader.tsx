"use client";

import { useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";

/**
 * Read an image File, downscale it (max 2000px, high-quality JPEG q0.92) on a
 * canvas, and return a data URL. Any input size is accepted: larger photos are
 * scaled down to fit within `maxDim` while keeping their aspect ratio, and
 * smaller ones are left untouched (never upscaled). The high `maxDim`/`quality`
 * keep the stored picture crisp; the data URL is saved straight to
 * ProductImage.url so uploads stay inline with no S3.
 */
export async function fileToDataUrl(file: File, maxDim = 2000, quality = 0.92): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = new window.Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("decode failed"));
    img.src = raw;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Multi-image picker: upload one or more files (auto-downscaled) and/or paste
 * image URLs. The first image is the cover; any other can be promoted. Managed
 * as a plain ordered string[] so callers can send it straight to the server.
 *
 * Tiles are a responsive square grid (matching the square storefront crop) and
 * every control stays visible — no hover-only actions — so re-picking the cover
 * or removing an image works with a tap on mobile.
 */
export function ImageUploader({
  images,
  onChange,
  max = 8,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [err, setErr] = useState("");

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    if (!files.length) return;
    setErr("");
    const room = max - images.length;
    if (room <= 0) return setErr(`Up to ${max} images.`);
    setUploading(true);
    try {
      const urls = await Promise.all(files.slice(0, room).map((f) => fileToDataUrl(f)));
      onChange([...images, ...urls]);
      if (files.length > room) setErr(`Only the first ${room} were added (max ${max}).`);
    } catch {
      setErr("Couldn’t read one of those images.");
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (images.length >= max) return setErr(`Up to ${max} images.`);
    onChange([...images, u]);
    setUrlInput("");
    setErr("");
  }

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => {
    const pick = images[i];
    if (pick === undefined) return;
    onChange([pick, ...images.filter((_, idx) => idx !== i)]);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {images.map((src, i) => (
          <div
            key={`${i}-${src.slice(0, 24)}`}
            className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Image ${i + 1}`} className="size-full object-cover" />

            {i === 0 ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/70 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-background">
                Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(i)}
                title="Make cover"
                aria-label="Make cover image"
                className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-foreground/70 px-2 py-1 text-[10px] font-semibold text-background backdrop-blur transition hover:bg-foreground"
              >
                <Star className="size-3.5" />
                <span className="hidden sm:inline">Cover</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove image"
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-foreground/70 text-background backdrop-blur transition hover:bg-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        {images.length < max && (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed text-muted-foreground transition hover:border-primary hover:text-primary">
            <div className="flex flex-col items-center gap-1">
              <ImagePlus className="size-6" />
              <span className="text-[11px] font-medium">{uploading ? "Adding…" : "Add photo"}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFiles}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="…or paste an image URL"
          className="h-10 flex-1 rounded-lg border bg-card px-3 text-[13px] focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim()}
          className="h-10 shrink-0 rounded-lg border px-3.5 text-[13px] font-semibold hover:bg-muted disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
        <span className="text-muted-foreground">
          {images.length > 0 ? "First image is the cover · shown square on the store." : "No images yet."}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {images.length}/{max}
        </span>
      </div>
      {err && <p className="mt-0.5 text-[12px] text-destructive">{err}</p>}
    </div>
  );
}
