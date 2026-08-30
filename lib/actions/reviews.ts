"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1, "Add a title."),
  body: z.string().trim().min(1, "Add a few words."),
});

/**
 * Submit a review — only for a product the user has actually had delivered, and
 * at most one per product (enforced by the composite unique + upsert).
 */
export async function submitReviewAction(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid review." };
  }
  const { productId, rating, title, body } = parsed.data;

  const purchased = await prisma.orderItem.findFirst({
    where: {
      order: { userId: user.id, status: OrderStatus.DELIVERED },
      variant: { productId },
    },
    include: { variant: { include: { product: { select: { slug: true } } } } },
  });
  if (!purchased) {
    return { ok: false as const, error: "You can only review delivered purchases." };
  }

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: { productId, userId: user.id, rating, title, body },
    update: { rating, title, body },
  });

  revalidatePath("/account/reviews");
  if (purchased.variant) revalidateTag(`product:${purchased.variant.product.slug}`);
  revalidateTag("catalog");
  return { ok: true as const };
}
