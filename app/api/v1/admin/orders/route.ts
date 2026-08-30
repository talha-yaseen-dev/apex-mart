import { getAdminOrders } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Admin order list, optionally filtered by ?filter=<OrderStatus|ALL>. */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.ORDERS_VIEW);
  const filter = new URL(req.url).searchParams.get("filter") ?? "ALL";
  return ok(await getAdminOrders(filter));
});
