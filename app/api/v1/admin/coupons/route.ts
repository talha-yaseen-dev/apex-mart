import { getAdminCoupons } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { createCoupon } from "@/lib/api/admin";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** List coupons (staff can view + toggle). */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.COUPONS_TOGGLE);
  return ok(await getAdminCoupons());
});

/** Create a coupon — admin only (coupons:manage). */
export const POST = handle(async (req) => {
  const { user } = await requirePerm(req, PERMISSIONS.COUPONS_MANAGE);
  const body = await readJson(req);
  await createCoupon(user.id, {
    code: String(body.code ?? ""),
    type: body.type,
    value: Number(body.value ?? 0),
    minSpendMinor: Number(body.minSpendMinor ?? 0),
    maxRedemptions: Number(body.maxRedemptions ?? 0),
  });
  return ok(await getAdminCoupons(), 201);
});
