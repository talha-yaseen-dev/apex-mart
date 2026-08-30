import { ProductStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { setProductStatus } from "@/lib/api/admin";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Change a product's status. Body: { status: DRAFT|ACTIVE|ARCHIVED }. */
export const POST = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.CATALOG_PUBLISH);
    const { id } = await params;
    const status = String((await readJson(req)).status ?? "");
    if (!(status in ProductStatus)) return fail(400, "Invalid status.");
    await setProductStatus(user.id, id, status as ProductStatus);
    return ok({ status });
  },
);
