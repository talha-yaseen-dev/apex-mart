import { requireUser } from "@/lib/api/auth";
import { checkoutSchema, createOrderFor } from "@/lib/api/checkout";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Create a PENDING order from the cart. Body: { shipMethod, couponCode?, address }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const parsed = checkoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "Please complete the required fields.");
  const result = await createOrderFor(user.id, user.email, parsed.data);
  return ok(result);
});
