import { getInventory } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { adjustStock } from "@/lib/api/admin";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Adjust a variant's stock. Body: { variantId, delta, reason }. */
export const POST = handle(async (req) => {
  const { user } = await requirePerm(req, PERMISSIONS.INVENTORY_ADJUST);
  const body = await readJson(req);
  const variantId = String(body.variantId ?? "");
  const delta = Number(body.delta);
  if (!variantId || !Number.isFinite(delta)) return fail(400, "Enter a variant and amount.");
  await adjustStock(user.id, variantId, delta, String(body.reason ?? "ADJUSTMENT"));
  return ok(await getInventory());
});
