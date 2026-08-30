import { requireUser } from "@/lib/api/auth";
import { getCartViewFor, addToCartFor } from "@/lib/api/cart";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** The signed-in user's cart. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(await getCartViewFor(user.id));
});

/** Add a variant to the cart. Body: { variantId, qty? }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const variantId = String(body.variantId ?? "");
  if (!variantId) return fail(400, "Missing variantId.");
  const qty = Number(body.qty ?? 1);
  return ok(await addToCartFor(user.id, variantId, Number.isFinite(qty) ? qty : 1));
});
