import { getCustomers } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Customer list with order counts + lifetime value. */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.CUSTOMERS_VIEW);
  return ok(await getCustomers());
});
