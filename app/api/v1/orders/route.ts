import { getUserOrders } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** The signed-in user's order history. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(await getUserOrders(user.id));
});
