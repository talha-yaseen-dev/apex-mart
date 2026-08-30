import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { markOrderShipped } from "@/lib/api/admin";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Hand a packed order to the carrier (marks the shipment SHIPPED). */
export const POST = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.ORDERS_FULFILL);
    const { id } = await params;
    await markOrderShipped(user.id, id);
    return ok({ shipped: true });
  },
);
