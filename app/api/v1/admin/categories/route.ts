import { getAdminCategories } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { createCategory } from "@/lib/api/admin";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Categories with product counts. Readable by anyone who can file products. */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.CATALOG_CONTENT);
  return ok(await getAdminCategories());
});

/** Create a category. Body: { name }. */
export const POST = handle(async (req) => {
  const { user } = await requirePerm(req, PERMISSIONS.CATEGORIES_MANAGE);
  await createCategory(user.id, await readJson(req));
  return ok(await getAdminCategories(), 201);
});
