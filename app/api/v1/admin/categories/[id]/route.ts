import { getAdminCategories } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, assertNotDemo } from "@/lib/api/auth";
import { deleteCategory } from "@/lib/api/admin";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Delete a category — managers/admins (categories:manage). */
export const DELETE = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.CATEGORIES_MANAGE);
    assertNotDemo(user);
    const { id } = await params;
    await deleteCategory(user.id, id);
    return ok(await getAdminCategories());
  },
);
