import { requireUser } from "@/lib/api/auth";
import { setItemQtyFor, removeItemFor } from "@/lib/api/cart";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

type Ctx = { params: Promise<{ id: string }> };

/** Update a line's quantity. Body: { qty }. qty <= 0 removes the line. */
export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  const body = await readJson(req);
  const qty = Number(body.qty);
  if (!Number.isFinite(qty)) return fail(400, "Missing qty.");
  return ok(await setItemQtyFor(user.id, id, qty));
});

/** Remove a line from the cart. */
export const DELETE = handle(async (req, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  return ok(await removeItemFor(user.id, id));
});
