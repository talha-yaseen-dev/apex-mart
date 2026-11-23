import "server-only";
import { revalidateTag } from "next/cache";
import { randomBytes } from "node:crypto";
import {
  CouponType,
  InvReason,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  RefundStatus,
  ShipmentStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { ORDER_TRANSITIONS } from "@/lib/admin";
import { notifyOrderRefunded, notifyOrderShipped } from "@/lib/notify";
import { ApiError } from "@/lib/api/http";
import { isTyreCategory } from "@/lib/tyres";

/**
 * Admin mutations for the mobile API. Each mirrors the corresponding server
 * action in lib/actions/admin.ts (same writes, same audit trail, same catalog
 * cache busting). Permission enforcement happens at the route via requirePerm,
 * so these take the resolved actorId directly.
 */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ── Products ──────────────────────────────────────────────────
export async function setProductStatus(
  actorId: string,
  productId: string,
  status: ProductStatus,
) {
  const before = await prisma.product.findUnique({ where: { id: productId } });
  if (!before) throw new ApiError(404, "Product not found.");
  await prisma.product.update({ where: { id: productId }, data: { status } });
  await logAudit({
    actorId,
    action: "product.status",
    targetType: "Product",
    targetId: productId,
    diff: { from: before.status, to: status },
  });
  revalidateTag("catalog");
}

export async function updateVariant(
  actorId: string,
  variantId: string,
  data: { priceMinor: number; stock: number },
) {
  const priceMinor = Math.max(0, Math.round(data.priceMinor));
  const stock = Math.max(0, Math.round(data.stock));
  await prisma.productVariant.update({ where: { id: variantId }, data: { priceMinor, stock } });
  await logAudit({
    actorId,
    action: "variant.update",
    targetType: "ProductVariant",
    targetId: variantId,
    diff: { priceMinor, stock },
  });
  revalidateTag("catalog");
}

const productImagesSchema = z
  .array(z.string().trim().url("Enter a valid image URL."))
  .max(8, "Up to 8 images per product.")
  .optional();

const createProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name."),
  categoryId: z.string().min(1, "Choose a category."),
  brand: z.string().trim().max(60, "Brand name is too long.").optional(),
  size: z.string().trim().min(3, "Enter a tyre size."),
  priceMinor: z.number().int().min(0, "Price can’t be negative."),
  stock: z.number().int().min(0, "Stock can’t be negative."),
  sku: z.string().trim().toUpperCase().optional(),
  images: productImagesSchema,
});

export async function createProduct(
  actorId: string,
  input: unknown,
  // Content-only creators (no catalog:publish) get a DRAFT they can't push live.
  publishNow = true,
) {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the fields.");
  }
  const d = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category || !isTyreCategory(category.slug))
    throw new ApiError(400, "Choose a tyre category.");

  let slug = slugify(d.name) || `product-${randomBytes(3).toString("hex")}`;
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }
  const sku = d.sku
    ? d.sku
    : `${slug.replace(/-/g, "").slice(0, 6).toUpperCase()}-${randomBytes(2)
        .toString("hex")
        .toUpperCase()}`;
  if (await prisma.productVariant.findUnique({ where: { sku } })) {
    throw new ApiError(409, `SKU “${sku}” is already in use.`);
  }

  const product = await prisma.product.create({
    data: {
      name: d.name,
      slug,
      categoryId: d.categoryId,
      brand: d.brand || null,
      status: publishNow ? ProductStatus.ACTIVE : ProductStatus.DRAFT,
      variants: { create: { sku, priceMinor: d.priceMinor, stock: d.stock, currency: "PKR", attributes: { size: d.size } } },
      images: d.images?.length
        ? { create: d.images.map((url, i) => ({ url, alt: d.name, position: i })) }
        : undefined,
    },
    select: { id: true, slug: true },
  });

  await logAudit({
    actorId,
    action: "product.create",
    targetType: "Product",
    targetId: product.id,
    diff: { name: d.name, slug, sku, priceMinor: d.priceMinor, stock: d.stock },
  });
  revalidateTag("catalog");
  return { id: product.id, slug: product.slug };
}

const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Enter a product name."),
  categoryId: z.string().min(1, "Choose a category."),
  brand: z.string().trim().max(60, "Brand name is too long.").optional(),
  images: productImagesSchema,
});

export async function updateProduct(actorId: string, input: unknown) {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the fields.");
  }
  const d = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id: d.id },
    select: { id: true, slug: true },
  });
  if (!existing) throw new ApiError(404, "Product not found.");

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category || !isTyreCategory(category.slug))
    throw new ApiError(400, "Choose a tyre category.");

  try {
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: d.id } }),
      ...(d.images?.length
        ? [
            prisma.productImage.createMany({
              data: d.images.map((url, i) => ({ productId: d.id, url, alt: d.name, position: i })),
            }),
          ]
        : []),
      prisma.product.update({
        where: { id: d.id },
        data: { name: d.name, categoryId: d.categoryId, brand: d.brand || null },
      }),
    ]);
  } catch {
    throw new ApiError(400, "Couldn't save those changes.");
  }

  await logAudit({
    actorId,
    action: "product.update",
    targetType: "Product",
    targetId: d.id,
    diff: { name: d.name, categoryId: d.categoryId, images: d.images?.length ?? 0 },
  });
  revalidateTag("catalog");
  revalidateTag(`product:${existing.slug}`);
}

export async function deleteProduct(actorId: string, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) throw new ApiError(404, "Product not found.");
  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch {
    throw new ApiError(409, "Couldn't delete this product — it may still be referenced elsewhere.");
  }
  await logAudit({
    actorId,
    action: "product.delete",
    targetType: "Product",
    targetId: productId,
    diff: { name: product.name },
  });
  revalidateTag("catalog");
}

// ── Inventory ─────────────────────────────────────────────────
export async function adjustStock(
  actorId: string,
  variantId: string,
  delta: number,
  reason: string,
) {
  const d = Math.round(delta);
  if (!d) throw new ApiError(400, "Enter a non-zero adjustment.");
  const reasonEnum =
    (reason as InvReason) in InvReason ? (reason as InvReason) : InvReason.ADJUSTMENT;

  try {
    await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!v) throw new Error("Variant not found");
      const next = v.stock + d;
      if (next < 0) throw new Error("Adjustment would make stock negative.");
      await tx.productVariant.update({ where: { id: variantId }, data: { stock: next } });
      await tx.inventoryLog.create({
        data: { variantId, delta: d, reason: reasonEnum, actorId },
      });
    });
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  await logAudit({
    actorId,
    action: "inventory.adjust",
    targetType: "ProductVariant",
    targetId: variantId,
    diff: { delta: d, reason: reasonEnum },
  });
  revalidateTag("catalog");
}

// ── Orders ────────────────────────────────────────────────────
export async function transitionOrder(actorId: string, orderId: string, to: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found.");
  if (!ORDER_TRANSITIONS[order.status].includes(to)) {
    throw new ApiError(409, `Cannot move ${order.status} → ${to}.`);
  }
  if (to === OrderStatus.DELIVERED) {
    const shipped = await prisma.shipment.findFirst({
      where: {
        orderId,
        status: { in: [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED] },
      },
      select: { id: true },
    });
    if (!shipped) throw new ApiError(409, "Mark the order shipped before delivering.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    if (to === OrderStatus.FULFILLED) {
      await tx.shipment.create({
        data: {
          orderId,
          carrier: "UPS",
          trackingNumber: `1Z${randomBytes(6).toString("hex").toUpperCase()}`,
          status: ShipmentStatus.PENDING,
        },
      });
    }
    if (to === OrderStatus.DELIVERED) {
      await tx.shipment.updateMany({
        where: { orderId },
        data: { status: ShipmentStatus.DELIVERED, deliveredAt: new Date() },
      });
    }
  });

  await logAudit({
    actorId,
    action: "order.transition",
    targetType: "Order",
    targetId: orderId,
    diff: { from: order.status, to },
  });
}

export async function markOrderShipped(actorId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipments: { orderBy: { id: "asc" }, take: 1 } },
  });
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status !== OrderStatus.FULFILLED) {
    throw new ApiError(409, "Pack the order before shipping it.");
  }
  const shipment = order.shipments[0];
  if (!shipment) throw new ApiError(409, "No shipment to ship.");
  if (shipment.status !== ShipmentStatus.PENDING) {
    throw new ApiError(409, "This order has already shipped.");
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: ShipmentStatus.SHIPPED, shippedAt: new Date() },
  });
  await logAudit({
    actorId,
    action: "order.ship",
    targetType: "Order",
    targetId: orderId,
    diff: { shipmentId: shipment.id },
  });
  await notifyOrderShipped(orderId);
}

export async function refundOrder(actorId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { where: { status: PaymentStatus.SUCCEEDED }, take: 1 } },
  });
  if (!order) throw new ApiError(404, "Order not found.");
  const payment = order.payments[0];
  if (!payment) throw new ApiError(409, "No captured payment to refund.");
  if (order.status === OrderStatus.REFUNDED) throw new ApiError(409, "Order is already refunded.");

  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        paymentId: payment.id,
        amountMinor: order.totalMinor,
        reason: "Admin full refund",
        status: RefundStatus.SUCCEEDED,
      },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: { variantId: item.variantId, delta: item.quantity, reason: InvReason.RETURN, actorId },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED } });
  });

  await logAudit({
    actorId,
    action: "order.refund",
    targetType: "Order",
    targetId: orderId,
    diff: { amountMinor: order.totalMinor },
  });
  await notifyOrderRefunded(orderId);
  revalidateTag("catalog");
}

// ── Coupons ───────────────────────────────────────────────────
const couponSchema = z.object({
  code: z.string().trim().min(3).toUpperCase(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.number().int().min(0),
  minSpendMinor: z.number().int().min(0).default(0),
  maxRedemptions: z.number().int().min(0).default(0),
});

export async function createCoupon(actorId: string, input: unknown) {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "Check the coupon fields.");

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) throw new ApiError(409, "That code already exists.");

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      type: parsed.data.type as CouponType,
      value: parsed.data.value,
      minSpendMinor: parsed.data.minSpendMinor,
      maxRedemptions: parsed.data.maxRedemptions,
    },
  });
  await logAudit({
    actorId,
    action: "coupon.create",
    targetType: "Coupon",
    targetId: coupon.id,
    diff: { code: coupon.code },
  });
}

export async function toggleCoupon(actorId: string, couponId: string) {
  const c = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!c) throw new ApiError(404, "Coupon not found.");
  await prisma.coupon.update({ where: { id: couponId }, data: { active: !c.active } });
  await logAudit({
    actorId,
    action: "coupon.toggle",
    targetType: "Coupon",
    targetId: couponId,
    diff: { active: !c.active },
  });
}

export async function deleteCoupon(actorId: string, couponId: string) {
  const c = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!c) throw new ApiError(404, "Coupon not found.");
  try {
    await prisma.coupon.delete({ where: { id: couponId } });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2003") {
      throw new ApiError(409, "This coupon has been used on orders — disable it instead of deleting.");
    }
    throw new ApiError(400, "Couldn't delete this coupon.");
  }
  await logAudit({
    actorId,
    action: "coupon.delete",
    targetType: "Coupon",
    targetId: couponId,
    diff: { code: c.code },
  });
}

// ── Categories ────────────────────────────────────────────────
const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name."),
});

export async function createCategory(actorId: string, input: unknown) {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the name.");
  }
  const { name } = parsed.data;

  const slug = slugify(name) || `category-${randomBytes(3).toString("hex")}`;
  if (await prisma.category.findUnique({ where: { slug } })) {
    throw new ApiError(409, `A category like “${name}” already exists.`);
  }
  const category = await prisma.category.create({ data: { name, slug }, select: { id: true } });
  await logAudit({
    actorId,
    action: "category.create",
    targetType: "Category",
    targetId: category.id,
    diff: { name, slug },
  });
}

export async function deleteCategory(actorId: string, categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  if (!category) throw new ApiError(404, "Category not found.");
  if (category._count.products > 0) {
    const n = category._count.products;
    throw new ApiError(
      409,
      `“${category.name}” still has ${n} product${n === 1 ? "" : "s"} — move or delete them first.`,
    );
  }
  try {
    await prisma.$transaction([
      prisma.product.deleteMany({ where: { categoryId, deletedAt: { not: null } } }),
      prisma.category.delete({ where: { id: categoryId } }),
    ]);
  } catch {
    throw new ApiError(409, "Couldn't delete this category — it's still referenced by other records.");
  }
  await logAudit({
    actorId,
    action: "category.delete",
    targetType: "Category",
    targetId: categoryId,
    diff: { name: category.name },
  });
}
