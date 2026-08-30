import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Serves a product image by its ProductImage id.
 *
 * Admin-uploaded images are stored as base64 data URLs. Inlining those in the
 * storefront payload bloats the HTML by ~70 KB per card, so the web render
 * references `/api/images/<id>` instead and this route streams the decoded
 * bytes — letting next/image optimize + lazily load them like any other image.
 *
 * Scoped to ACTIVE, non-deleted products so draft/archived media never becomes
 * publicly fetchable. A ProductImage row is immutable (edits delete + recreate
 * rows, never mutate a url in place), so the bytes for a given id never change
 * — safe to cache immutably; when a product's images change, the storefront
 * cards simply reference the new ids (catalog tag is revalidated on edit).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const image = await prisma.productImage.findFirst({
    where: { id, product: { status: "ACTIVE", deletedAt: null } },
    select: { url: true },
  });
  if (!image) return new Response("Not found", { status: 404 });

  // Already a hosted URL (pasted link / CDN) — this route only fronts data
  // URLs, but handle it defensively by pointing the client at the real source.
  if (!image.url.startsWith("data:")) {
    return Response.redirect(image.url, 308);
  }

  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(image.url);
  if (!match) return new Response("Unsupported image", { status: 415 });
  const mime = match[1] || "application/octet-stream";
  const data = match[3] ?? "";
  const bytes = match[2]
    ? new Uint8Array(Buffer.from(data, "base64"))
    : new TextEncoder().encode(decodeURIComponent(data));

  return new Response(bytes, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
