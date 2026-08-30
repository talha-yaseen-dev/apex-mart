import { getProductDetail } from "@/lib/catalog";
import { handle, ok, fail, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Full product detail (gallery, variants/axes, rating distribution, reviews). */
export const GET = handle(
  async (_req, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const product = await getProductDetail(slug);
    if (!product) return fail(404, "Product not found.");
    return ok(product);
  },
);
