import { getOrderForUser } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { handle, ok, fail, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Order detail with tracking timeline (ownership-scoped). */
export const GET = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const { id } = await params;
    const order = await getOrderForUser(id, user.id);
    if (!order) return fail(404, "Order not found.");
    return ok(order);
  },
);
