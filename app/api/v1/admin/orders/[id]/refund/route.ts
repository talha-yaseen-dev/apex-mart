import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, assertNotDemo } from "@/lib/api/auth";
import { refundOrder } from "@/lib/api/admin";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Full refund — requires orders:refund (admin / finance elevation). */
export const POST = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { user } = await requirePerm(req, PERMISSIONS.ORDERS_REFUND);
    assertNotDemo(user);
    const { id } = await params;
    await refundOrder(user.id, id);
    return ok({ refunded: true });
  },
);
