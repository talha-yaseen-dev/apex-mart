import { getAdminCategories } from "@/lib/admin";
import { can } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, canManage] = await Promise.all([
    getAdminCategories(),
    can(PERMISSIONS.CATEGORIES_MANAGE),
  ]);
  // Category create and delete are both the categories:manage capability now.
  const canDelete = canManage;
  return (
    <CategoriesManager
      categories={categories}
      canManage={canManage}
      canDelete={canDelete}
    />
  );
}
