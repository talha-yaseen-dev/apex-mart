import { getInventory } from "@/lib/admin";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { InventoryTable } from "@/components/admin/inventory-table";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);
  const rows = await getInventory();
  return (
    <div className="animate-fade">
      <h1 className="mb-1.5 font-display text-2xl font-bold tracking-tight">Inventory</h1>
      <p className="mb-5 text-[13px] text-muted-foreground">
        Adjustments write an InventoryLog entry with a reason and actor.
      </p>
      <InventoryTable rows={rows} />
    </div>
  );
}
