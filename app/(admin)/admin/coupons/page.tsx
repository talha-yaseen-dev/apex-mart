import { getAdminCoupons } from "@/lib/admin";
import { can, requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { CouponsManager } from "@/components/admin/coupons-manager";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  // Coupons/discounts are a manager/admin surface — routine staff can't view them.
  await requirePermission(PERMISSIONS.COUPONS_TOGGLE);
  const [coupons, canManage, canToggle] = await Promise.all([
    getAdminCoupons(),
    can(PERMISSIONS.COUPONS_MANAGE),
    can(PERMISSIONS.COUPONS_TOGGLE),
  ]);
  return (
    <CouponsManager coupons={coupons} canManage={canManage} canToggle={canToggle} />
  );
}
