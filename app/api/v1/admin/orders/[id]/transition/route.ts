import { OrderStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { transitionOrder } from "@/lib/api/admin";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Move an order to a new status. Body: { to: OrderStatus }. */
export const POST = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.ORDERS_FULFILL);
    const { id } = await params;
    const to = String((await readJson(req)).to ?? "");
    if (!(to in OrderStatus)) return fail(400, "Invalid status.");
    // Cancelling a paid order is a manager/admin action, above routine fulfilment.
    if (to === OrderStatus.CANCELLED) {
      await requirePerm(req, PERMISSIONS.ORDERS_CANCEL);
    }
    await transitionOrder(user.id, id, to as OrderStatus);
    return ok({ status: to });
  },
);
