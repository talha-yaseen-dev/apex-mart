import { requireUser } from "@/lib/api/auth";
import { confirmOrderFor } from "@/lib/api/checkout";
import { handle, ok, fail, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Complete a demo payment. Body: { orderId, method: "cod" | "card" }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const orderId = String(body.orderId ?? "");
  if (!orderId) return fail(400, "Missing orderId.");
  const method = body.method === "card" ? "card" : "cod";
  return ok(await confirmOrderFor(user.id, orderId, method));
});
