import { PERMISSIONS } from "@/lib/permissions";
import { requirePerm, assertNotDemo } from "@/lib/api/auth";
import { getTeam, roleCatalog, inviteMember } from "@/lib/api/access";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Staff directory + assignable roles (access:manage). */
export const GET = handle(async (req) => {
  await requirePerm(req, PERMISSIONS.ACCESS_MANAGE);
  const [team, roles] = await Promise.all([getTeam(), roleCatalog()]);
  return ok({ team, roles });
});

/** Invite / promote a teammate. Body: { email, roleName }. */
export const POST = handle(async (req) => {
  const { user } = await requirePerm(req, PERMISSIONS.ACCESS_MANAGE);
  assertNotDemo(user);
  const result = await inviteMember(user, await readJson(req));
  return ok(result, 201);
});
