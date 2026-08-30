import "server-only";
import { revalidateTag } from "next/cache";
import { OrderStatus, PaymentStatus, RefundStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { strongPasswordSchema } from "@/lib/validations/auth";
import { isPasswordPwned, PWNED_PASSWORD_MESSAGE } from "@/lib/pwned";
import { DEMO_ACCOUNT_LOCK_MESSAGE, isDemoAccount } from "@/lib/auth-constants";
import { ApiError } from "@/lib/api/http";

// ── Addresses ─────────────────────────────────────────────────
const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1),
  name: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional().default(""),
  city: z.string().trim().min(1),
  region: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  country: z.string().trim().min(2),
  isDefault: z.boolean().default(false),
});

export async function saveAddressFor(userId: string, input: unknown) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, "Fill in label, name, street, city, region, and postal code.");
  }
  const d = parsed.data;
  const data = {
    label: d.label,
    name: d.name,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    region: d.region,
    postalCode: d.postalCode,
    country: d.country,
    isDefault: d.isDefault,
  };
  if (d.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  if (d.id) {
    await prisma.address.updateMany({ where: { id: d.id, userId }, data });
  } else {
    await prisma.address.create({ data: { ...data, userId } });
  }
}

export async function deleteAddressFor(userId: string, id: string) {
  await prisma.address.deleteMany({ where: { id, userId } });
}

export async function setDefaultAddressFor(userId: string, id: string) {
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.updateMany({ where: { id, userId }, data: { isDefault: true } }),
  ]);
}

// ── Wishlist ──────────────────────────────────────────────────
export async function toggleWishlistFor(userId: string, productId: string) {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await prisma.wishlist.create({ data: { userId, productId } });
  return { saved: true };
}

export async function removeWishlistFor(userId: string, id: string) {
  await prisma.wishlist.deleteMany({ where: { id, userId } });
}

// ── Reviews ───────────────────────────────────────────────────
const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1, "Add a title."),
  body: z.string().trim().min(1, "Add a few words."),
});

export async function submitReviewFor(userId: string, input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid review.");
  }
  const { productId, rating, title, body } = parsed.data;

  const purchased = await prisma.orderItem.findFirst({
    where: {
      order: { userId, status: OrderStatus.DELIVERED },
      variant: { productId },
    },
    include: { variant: { include: { product: { select: { slug: true } } } } },
  });
  if (!purchased) throw new ApiError(403, "You can only review delivered purchases.");

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId } },
    create: { productId, userId, rating, title, body },
    update: { rating, title, body },
  });
  if (purchased.variant) revalidateTag(`product:${purchased.variant.product.slug}`);
  revalidateTag("catalog");
}

// ── Returns ───────────────────────────────────────────────────
const returnSchema = z.object({
  orderId: z.string().min(1),
  itemIds: z.array(z.string()).min(1, "Select at least one item to return."),
  reason: z.string().min(1, "Choose a reason."),
  note: z.string().optional().default(""),
});

export async function requestReturnFor(userId: string, input: unknown) {
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  const { orderId, itemIds, reason, note } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: OrderStatus.DELIVERED },
    include: {
      items: true,
      payments: { where: { status: PaymentStatus.SUCCEEDED }, take: 1 },
    },
  });
  if (!order) throw new ApiError(400, "This order isn’t eligible for a return.");
  const payment = order.payments[0];
  if (!payment) throw new ApiError(400, "No captured payment to refund against.");

  const selected = order.items.filter((i) => itemIds.includes(i.id));
  if (!selected.length) throw new ApiError(400, "Select at least one item.");
  const amountMinor = selected.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0);

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amountMinor,
      reason: note ? `${reason}: ${note}` : reason,
      status: RefundStatus.PENDING,
    },
  });
  return { rma: `RMA-${refund.id.slice(-5).toUpperCase()}` };
}

// ── Profile ───────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "That name is too long."),
  image: z.string().trim().max(3_000_000).optional(),
});

export async function updateProfileFor(userId: string, input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid name.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      ...(parsed.data.image !== undefined ? { image: parsed.data.image || null } : {}),
    },
  });
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: strongPasswordSchema,
    confirm: z.string().min(1),
  })
  .refine((v) => v.next === v.confirm, {
    message: "New passwords don’t match.",
    path: ["confirm"],
  });

export async function changePasswordFor(
  user: { id: string; email: string },
  input: unknown,
) {
  if (isDemoAccount(user.email)) throw new ApiError(403, DEMO_ACCOUNT_LOCK_MESSAGE);

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the fields.");
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) throw new ApiError(404, "Account not found.");

  const valid = await verifyPassword(dbUser.passwordHash, parsed.data.current);
  if (!valid) throw new ApiError(400, "Your current password is incorrect.");
  if (parsed.data.next === parsed.data.current) {
    throw new ApiError(400, "Choose a password different from your current one.");
  }
  if (await isPasswordPwned(parsed.data.next)) {
    throw new ApiError(400, PWNED_PASSWORD_MESSAGE);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
}
