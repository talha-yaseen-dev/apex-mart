import { requireUser } from "@/lib/api/auth";
import { quoteFor } from "@/lib/api/checkout";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Price the cart. Body: { shipMethod?, couponCode?, country? }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const result = await quoteFor(user.id, {
    shipMethod: body.shipMethod ? String(body.shipMethod) : undefined,
    couponCode: body.couponCode ? String(body.couponCode) : undefined,
    country: body.country ? String(body.country) : undefined,
  });
  return ok(result);
});
