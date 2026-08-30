import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { updateVariant } from "@/lib/api/admin";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Update a variant's price + stock. Body: { priceMinor, stock }. */
export const PATCH = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.CATALOG_PRICING);
    const { id } = await params;
    const body = await readJson(req);
    const priceMinor = Number(body.priceMinor);
    const stock = Number(body.stock);
    if (!Number.isFinite(priceMinor) || !Number.isFinite(stock)) {
      return fail(400, "Enter a price and stock.");
    }
    await updateVariant(user.id, id, { priceMinor, stock });
    return ok({ priceMinor, stock });
  },
);
