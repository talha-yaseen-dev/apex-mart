import { getDashboard } from "@/lib/admin";
import { requireEmployee } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Admin dashboard KPIs, recent orders, and low-stock list. */
export const GET = handle(async (req) => {
  await requireEmployee(req);
  return ok(await getDashboard());
});
