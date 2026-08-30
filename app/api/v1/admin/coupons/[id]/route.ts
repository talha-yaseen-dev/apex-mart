import { getAdminCoupons } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, assertNotDemo } from "@/lib/api/auth";
import { toggleCoupon, deleteCoupon } from "@/lib/api/admin";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

type Ctx = { params: Promise<{ id: string }> };

/** Enable / disable a coupon (staff — coupons:toggle). */
export const PATCH = handle(async (req, { params }: Ctx) => {
  const { user } = await requirePerm(req, PERMISSIONS.COUPONS_TOGGLE);
  const { id } = await params;
  await toggleCoupon(user.id, id);
  return ok(await getAdminCoupons());
});

/** Delete a coupon — admin only (coupons:manage). */
export const DELETE = handle(async (req, { params }: Ctx) => {
  const { user } = await requirePerm(req, PERMISSIONS.COUPONS_MANAGE);
  assertNotDemo(user);
  const { id } = await params;
  await deleteCoupon(user.id, id);
  return ok(await getAdminCoupons());
});
