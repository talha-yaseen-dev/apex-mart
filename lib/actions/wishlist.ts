"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Toggle a product in the wishlist. Returns needsAuth for guests. */
export async function toggleWishlistAction(productId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, needsAuth: true };

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return { ok: true as const, saved: false };
  }
  await prisma.wishlist.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true as const, saved: true };
}

export async function removeWishlistAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  await prisma.wishlist.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/wishlist");
  return { ok: true as const };
}
