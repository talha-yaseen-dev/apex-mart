import { resetPasswordAction } from "@/lib/actions/auth";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Complete a password reset with a single-use token. */
export const POST = handle(async (req) => {
  const body = await readJson(req);
  const res = await resetPasswordAction({
    token: String(body.token ?? ""),
    password: String(body.password ?? ""),
    confirm: String(body.confirm ?? ""),
  });
  if (!res.ok) return fail(400, res.error);
  return ok({});
});
