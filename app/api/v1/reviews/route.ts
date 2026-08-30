import { getReviewData } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { submitReviewFor } from "@/lib/api/account";
import { handle, ok, preflight, readJson } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Review dashboard: products awaiting a review + the user's own reviews. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return ok(await getReviewData(user.id));
});

/** Submit (or update) a review. Body: { productId, rating, title, body }. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  await submitReviewFor(user.id, await readJson(req));
  return ok(await getReviewData(user.id));
});
