import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { updateProfileFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson, MAX_AVATAR_JSON_BYTES } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Update the signed-in user's name / avatar. Body: { name, image? }. */
export const PATCH = handle(async (req) => {
  const user = await requireUser(req);
  await updateProfileFor(user.id, await readJson(req, MAX_AVATAR_JSON_BYTES));
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isEmployee: true,
      image: true,
      isPrimaryAdmin: true,
    },
  });
  return ok({ user: fresh });
});
