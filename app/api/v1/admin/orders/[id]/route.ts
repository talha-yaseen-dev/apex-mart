import { getAdminOrder, ORDER_TRANSITIONS } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { handle, ok, fail, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Admin order detail (with the allowed next-state transitions). */
export const GET = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    await requirePerm(req, PERMISSIONS.ORDERS_VIEW);
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return fail(404, "Order not found.");
    return ok({ order, nextStates: ORDER_TRANSITIONS[order.status] });
  },
);
