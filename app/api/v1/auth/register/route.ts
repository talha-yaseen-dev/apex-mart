import { registerAction } from "@/lib/actions/auth";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Register a new account (enumeration-safe — always resolves neutrally). */
export const POST = handle(async (req) => {
  const body = await readJson(req);
  const res = await registerAction({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });
  if (!res.ok) return fail(400, res.error);
  return ok({ email: res.email });
});
