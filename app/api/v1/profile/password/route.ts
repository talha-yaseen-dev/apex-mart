import { requireUser } from "@/lib/api/auth";
import { changePasswordFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Change password. Body: { current, next, confirm }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  await changePasswordFor({ id: user.id, email: user.email }, await readJson(req));
  return ok({});
});
