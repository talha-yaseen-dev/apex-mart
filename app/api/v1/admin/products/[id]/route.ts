import { getAdminProduct } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, assertNotDemo } from "@/lib/api/auth";
import { updateProduct, deleteProduct } from "@/lib/api/admin";
import { handle, ok, fail, preflight, readJson, MAX_IMAGE_JSON_BYTES } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

type Ctx = { params: Promise<{ id: string }> };

/** Product detail for the admin editor. */
export const GET = handle(async (req, { params }: Ctx) => {
  await requirePerm(req, PERMISSIONS.CATALOG_CONTENT);
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) return fail(404, "Product not found.");
  return ok(product);
});

/** Edit name / category / brand / images. */
export const PATCH = handle(async (req, { params }: Ctx) => {
  const { user } = await requirePerm(req, PERMISSIONS.CATALOG_CONTENT);
  const { id } = await params;
  await updateProduct(user.id, { ...(await readJson(req, MAX_IMAGE_JSON_BYTES)), id });
  return ok(await getAdminProduct(id));
});

/** Permanently delete a product — admin only (catalog:delete). */
export const DELETE = handle(async (req, { params }: Ctx) => {
  const { user } = await requirePerm(req, PERMISSIONS.CATALOG_DELETE);
  assertNotDemo(user);
  const { id } = await params;
  await deleteProduct(user.id, id);
  return ok({ deleted: true });
});
