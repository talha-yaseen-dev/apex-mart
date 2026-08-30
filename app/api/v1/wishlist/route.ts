import { getWishlist } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { toggleWishlistFor } from "@/lib/api/account";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** The user's wishlist. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(await getWishlist(user.id));
});

/** Toggle a product in the wishlist. Body: { productId }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const productId = String(body.productId ?? "");
  if (!productId) return fail(400, "Missing productId.");
  const result = await toggleWishlistFor(user.id, productId);
  return ok({ ...result, items: await getWishlist(user.id) });
});
