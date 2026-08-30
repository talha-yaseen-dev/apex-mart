import { getEffectivePermissions } from "@/lib/permissions";
import { getAccountCounts } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** The signed-in user, their effective permissions, and header counts. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const [perms, counts] = await Promise.all([
    getEffectivePermissions(user.id, user.role),
    getAccountCounts(user.id),
  ]);
  return ok({ user, permissions: [...perms], counts });
});
