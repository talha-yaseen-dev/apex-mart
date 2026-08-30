import { requireUser } from "@/lib/api/auth";
import { requestReturnFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Request a return (RMA). Body: { itemIds, reason, note? }. */
export const POST = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const { id } = await params;
    const body = await readJson(req);
    const result = await requestReturnFor(user.id, { ...body, orderId: id });
    return ok(result);
  },
);
