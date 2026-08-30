import { requireEmployee } from "@/lib/api/auth";
import { getMyAccess, requestElevation } from "@/lib/api/access";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** The signed-in employee's grants + the role catalog. */
export const GET = handle(async (req) => {
  const user = await requireEmployee(req);
  return ok(await getMyAccess(user));
});

/** Break-glass JIT elevation. Body: { roleName, minutes, reason }. */
export const POST = handle(async (req) => {
  const user = await requireEmployee(req);
  const body = await readJson(req);
  await requestElevation(user, {
    roleName: String(body.roleName ?? ""),
    minutes: Number(body.minutes ?? 0),
    reason: String(body.reason ?? ""),
  });
  return ok(await getMyAccess(user));
});
