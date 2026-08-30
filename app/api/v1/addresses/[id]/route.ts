import { getAddresses } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { deleteAddressFor, setDefaultAddressFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

type Ctx = { params: Promise<{ id: string }> };

/** Update an address flag. Body: { action: "setDefault" }. */
export const PATCH = handle(async (req, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  const body = await readJson(req);
  if (body.action === "setDefault") await setDefaultAddressFor(user.id, id);
  return ok(await getAddresses(user.id));
});

/** Delete an address. */
export const DELETE = handle(async (req, { params }: Ctx) => {
  const user = await requireUser(req);
  const { id } = await params;
  await deleteAddressFor(user.id, id);
  return ok(await getAddresses(user.id));
});
