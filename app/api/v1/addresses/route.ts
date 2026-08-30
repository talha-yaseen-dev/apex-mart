import { getAddresses } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { saveAddressFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** List the user's saved addresses. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(await getAddresses(user.id));
});

/** Create or update an address. Body includes optional `id` for an edit. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  await saveAddressFor(user.id, await readJson(req));
  return ok(await getAddresses(user.id));
});
