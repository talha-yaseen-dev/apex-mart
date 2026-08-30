import { getWishlist } from "@/lib/account";
import { requireUser } from "@/lib/api/auth";
import { removeWishlistFor } from "@/lib/api/account";
import { handle, ok, preflight } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = (req: Request) => preflight(req);

/** Remove a wishlist entry by its id. */
export const DELETE = handle(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser(req);
    const { id } = await params;
    await removeWishlistFor(user.id, id);
    return ok(await getWishlist(user.id));
  },
);
