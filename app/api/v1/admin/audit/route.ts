import { getAuditLog } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm } from "@/lib/api/auth";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Recent audit-log entries — admin only (access:manage). */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.ACCESS_MANAGE);
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 100);
  return ok(await getAuditLog(Number.isFinite(limit) ? limit : 100));
});
