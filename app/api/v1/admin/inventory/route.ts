import { getInventory } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Inventory levels with reserved quantities. */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.INVENTORY_ADJUST);
  return ok(await getInventory());
});
