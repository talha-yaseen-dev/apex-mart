import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, requireUser, assertNotDemo } from "@/lib/api/auth";
import {
  assignRole,
  removeMember,
  transferPrimaryAdmin,
  setAccountActive,
  getTeam,
} from "@/lib/api/access";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

type Ctx = { params: Promise<{ id: string }> };

/**
 * Team member actions. Body: { action, roleName? }.
 *   assignRole      → access:manage
 *   deactivate/... → primary admin only (checked inside setAccountActive)
 *   transferPrimary → primary admin only (checked inside)
 */
export const POST = handle(async (req, { params }: Ctx) => {
  const { id } = await params;
  const body = await readJson(req);
  const action = String(body.action ?? "");

  if (action === "assignRole") {
    const { user } = await requirePerm(req, PERMISSIONS.ACCESS_MANAGE);
    assertNotDemo(user);
    await assignRole(user, { userId: id, roleName: String(body.roleName ?? "") });
  } else if (action === "transferPrimary") {
    const user = await requireUser(req);
    assertNotDemo(user);
    await transferPrimaryAdmin(user, id);
  } else if (action === "deactivate" || action === "reactivate") {
    const user = await requireUser(req);
    assertNotDemo(user);
    await setAccountActive(user, id, action === "reactivate");
  } else {
    return fail(400, "Unknown action.");
  }
  return ok(await getTeam());
});

/** Remove a teammate from the staff directory (access:manage). */
export const DELETE = handle(async (req, { params }: Ctx) => {
  const { user } = await requirePerm(req, PERMISSIONS.ACCESS_MANAGE);
  assertNotDemo(user);
  const { id } = await params;
  await removeMember(user, id);
  return ok(await getTeam());
});
