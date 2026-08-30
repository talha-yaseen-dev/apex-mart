import { getAdminProducts, getCategories } from "@/lib/admin";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { createProduct } from "@/lib/api/admin";
import { handle, ok, preflight, readJson, MAX_IMAGE_JSON_BYTES } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Admin product list (with the category options for the create form). */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.CATALOG_CONTENT);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const [products, categories] = await Promise.all([getAdminProducts(q), getCategories()]);
  return ok({ products, categories });
});

/** Create a product with one variant. Body: createProduct fields. */
export const POST = handle(async (req) => {
  const { user, perms } = await requirePerm(req, PERMISSIONS.CATALOG_CONTENT);
  const result = await createProduct(
    user.id,
    await readJson(req, MAX_IMAGE_JSON_BYTES),
    hasPermission(perms, PERMISSIONS.CATALOG_PUBLISH),
  );
  return ok(result, 201);
});
