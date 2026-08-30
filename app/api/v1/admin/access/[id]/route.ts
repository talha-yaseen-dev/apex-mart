import { requireEmployee } from "@/lib/api/auth";
import { revokeAssignment, getMyAccess } from "@/lib/api/access";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Revoke a role assignment (your own, or any with access:manage). */
export const DELETE = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireEmployee(req);
    const { id } = await params;
    await revokeAssignment(user, id);
    return ok(await getMyAccess(user));
  },
);
