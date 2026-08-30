"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
import { authorize, can } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { ORDER_TRANSITIONS } from "@/lib/admin";
import { notifyOrderRefunded, notifyOrderShipped } from "@/lib/notify";
import { isDemoAccount, DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE } from "@/lib/auth-constants";

const DENIED = { ok: false as const, error: "You don't have permission to do that." };
const DEMO_BLOCKED = { ok: false as const, error: DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE };

// ── Products ──────────────────────────────────────────────────
export async function setProductStatusAction(
  productId: string,
  status: ProductStatus,
) {
  // Changing a product's status is the publish/unpublish control — managers and
  // admins only. Staff (content-only) can't move products on or off the store.
  const user = await authorize(PERMISSIONS.CATALOG_PUBLISH);
  if (!user) return DENIED;
  const before = await prisma.product.findUnique({ where: { id: productId } });
  await prisma.product.update({ where: { id: productId }, data: { status } });
  await logAudit({
    actorId: user.id,
    action: "product.status",
    targetType: "Product",
    targetId: productId,
    diff: { from: before?.status ?? null, to: status },
  });
  revalidatePath("/admin/products");
  return { ok: true as const };
}

export async function updateVariantAction(
  variantId: string,
  data: { priceMinor: number; stock: number },
) {
  // Editing a variant sets its price — reserved for pricing holders (managers/
  // admins). Staff change stock through the audited Inventory adjustment flow.
  const user = await authorize(PERMISSIONS.CATALOG_PRICING);
  if (!user) return DENIED;
  const priceMinor = Math.max(0, Math.round(data.priceMinor));
  const stock = Math.max(0, Math.round(data.stock));
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { priceMinor, stock },
  });
  await logAudit({
    actorId: user.id,
    action: "variant.update",
    targetType: "ProductVariant",
    targetId: variantId,
    diff: { priceMinor, stock },
  });
  revalidatePath("/admin/products");
  return { ok: true as const };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Accepts http(s) URLs and inline data: URLs (both parse via `new URL`).
const productImagesSchema = z
  .array(z.string().trim().url("Enter a valid image URL."))
  .max(8, "Up to 8 images per product.")
  .optional();

const createProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name."),
  categoryId: z.string().min(1, "Choose a category."),
  // Optional brand/manufacturer (e.g. Samsung, Apple).
  brand: z.string().trim().max(60, "Brand name is too long.").optional(),
  priceMinor: z.number().int().min(0, "Price can’t be negative."),
  stock: z.number().int().min(0, "Stock can’t be negative."),
  sku: z.string().trim().toUpperCase().optional(),
  images: productImagesSchema,
});

/** Add a catalog item: a new product with one variant (and an optional image). */
export async function createProductAction(input: unknown) {
  const user = await authorize(PERMISSIONS.CATALOG_CONTENT);
  if (!user) return DENIED;
  // Staff (content-only) create drafts; going live on the storefront needs
  // catalog:publish, so without it a new product starts as a DRAFT.
  const publishNow = await can(PERMISSIONS.CATALOG_PUBLISH);

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }
  const d = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return { ok: false as const, error: "Category not found." };

  // Unique slug (append a short suffix if the base is taken).
  let slug = slugify(d.name) || `product-${randomBytes(3).toString("hex")}`;
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${randomBytes(2).toString("hex")}`;
  }
  // SKU: use the given one (must be unique) or derive one.
  const sku = d.sku
    ? d.sku
    : `${slug.replace(/-/g, "").slice(0, 6).toUpperCase()}-${randomBytes(2)
        .toString("hex")
        .toUpperCase()}`;
  if (await prisma.productVariant.findUnique({ where: { sku } })) {
    return { ok: false as const, error: `SKU “${sku}” is already in use.` };
  }

  const product = await prisma.product.create({
    data: {
      name: d.name,
      slug,
      categoryId: d.categoryId,
      brand: d.brand || null,
      status: publishNow ? ProductStatus.ACTIVE : ProductStatus.DRAFT,
      variants: { create: { sku, priceMinor: d.priceMinor, stock: d.stock } },
      images: d.images?.length
        ? { create: d.images.map((url, i) => ({ url, alt: d.name, position: i })) }
        : undefined,
    },
    select: { id: true, slug: true },
  });

  await logAudit({
    actorId: user.id,
    action: "product.create",
    targetType: "Product",
    targetId: product.id,
    diff: { name: d.name, slug, sku, priceMinor: d.priceMinor, stock: d.stock },
  });
  revalidatePath("/admin/products");
  revalidateTag("catalog"); // storefront listing is cached by this tag
  return { ok: true as const, id: product.id, slug: product.slug };
}

const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Enter a product name."),
  categoryId: z.string().min(1, "Choose a category."),
  brand: z.string().trim().max(60, "Brand name is too long.").optional(),
  images: productImagesSchema,
});

/**
 * Edit a product's details: name, category and image gallery. The slug is kept
 * stable on rename so existing storefront links keep working. Images are
 * replaced wholesale to match the editor's ordered set.
 */
export async function updateProductAction(input: unknown) {
  const user = await authorize(PERMISSIONS.CATALOG_CONTENT);
  if (!user) return DENIED;

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }
  const d = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id: d.id },
    select: { id: true, name: true, categoryId: true, slug: true },
  });
  if (!existing) return { ok: false as const, error: "Product not found." };

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return { ok: false as const, error: "Category not found." };

  try {
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: d.id } }),
      ...(d.images?.length
        ? [
            prisma.productImage.createMany({
              data: d.images.map((url, i) => ({
                productId: d.id,
                url,
                alt: d.name,
                position: i,
              })),
            }),
          ]
        : []),
      prisma.product.update({
        where: { id: d.id },
        data: { name: d.name, categoryId: d.categoryId, brand: d.brand || null },
      }),
    ]);
  } catch (error) {
    const e = error as { code?: string; meta?: unknown; message?: string };
    console.error("product.update failed", { id: d.id, code: e?.code, meta: e?.meta, message: e?.message });
    return { ok: false as const, error: "Couldn't save those changes." };
  }

  await logAudit({
    actorId: user.id,
    action: "product.update",
    targetType: "Product",
    targetId: d.id,
    diff: { name: d.name, categoryId: d.categoryId, images: d.images?.length ?? 0 },
  });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${d.id}`);
  revalidatePath(`/products/${existing.slug}`);
  revalidateTag("catalog");
  return { ok: true as const };
}

/**
 * Permanently remove a catalog item. Cascades its variants, images, reviews and
 * wishlist entries; any past order lines keep their snapshot (OrderItem.variantId
 * is SetNull), so order history stays intact. Deletion is permanent — nothing is
 * archived or hidden.
 */
export async function deleteProductAction(productId: string) {
  const user = await authorize(PERMISSIONS.CATALOG_DELETE);
  if (!user) return DENIED;
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) return { ok: false as const, error: "Product not found." };

  try {
    // Cascades variants/images/reviews/wishlist; order lines detach via SetNull.
    await prisma.product.delete({ where: { id: productId } });
  } catch {
    return {
      ok: false as const,
      error: "Couldn't delete this product — it may still be referenced elsewhere.",
    };
  }

  await logAudit({
    actorId: user.id,
    action: "product.delete",
    targetType: "Product",
    targetId: productId,
    diff: { name: product.name },
  });
  revalidatePath("/admin/products");
  revalidateTag("catalog");
  return { ok: true as const, mode: "deleted" as const };
}

/**
 * Archive (soft-delete) a product: it disappears from the public storefront
 * immediately but stays in the database, so historical orders keep showing the
 * original product and it can be restored. Because archiving is reversible it is
 * the default "Remove" action and is allowed for the shared demo accounts —
 * only the irreversible permanent delete above stays demo-blocked.
 */
export async function archiveProductAction(productId: string) {
  const user = await authorize(PERMISSIONS.CATALOG_ARCHIVE);
  if (!user) return DENIED;

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!product) return { ok: false as const, error: "Product not found." };

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });
  await logAudit({
    actorId: user.id,
    action: "product.archive",
    targetType: "Product",
    targetId: productId,
    diff: { name: product.name },
  });
  revalidatePath("/admin/products");
  revalidateTag("catalog");
  return { ok: true as const, mode: "archived" as const };
}

/** Restore a previously archived product back to the catalog. */
export async function restoreProductAction(productId: string) {
  const user = await authorize(PERMISSIONS.CATALOG_ARCHIVE);
  if (!user) return DENIED;

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: { not: null } },
    select: { id: true, name: true },
  });
  if (!product) return { ok: false as const, error: "Product not found." };

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: null },
  });
  await logAudit({
    actorId: user.id,
    action: "product.restore",
    targetType: "Product",
    targetId: productId,
    diff: { name: product.name },
  });
  revalidatePath("/admin/products");
  revalidateTag("catalog");
  return { ok: true as const, mode: "restored" as const };
}

// ── Inventory ─────────────────────────────────────────────────
export async function adjustStockAction(
  variantId: string,
  delta: number,
  reason: string,
) {
  const user = await authorize(PERMISSIONS.INVENTORY_ADJUST);
  if (!user) return DENIED;
  const d = Math.round(delta);
  if (!d) return { ok: false as const, error: "Enter a non-zero adjustment." };

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
        data: { variantId, delta: d, reason: reasonEnum, actorId: user.id },
      });
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
  await logAudit({
    actorId: user.id,
    action: "inventory.adjust",
    targetType: "ProductVariant",
    targetId: variantId,
    diff: { delta: d, reason: reasonEnum },
  });
  revalidatePath("/admin/inventory");
  // Stock drives the storefront card's in-stock badge and the "In stock only"
  // filter (StoreCard.inStock), so a manual adjustment must refresh the cached
  // public catalog — otherwise the badge/filter stay stale until the 300s
  // revalidate window. Cheap here: manual adjustments are infrequent.
  revalidateTag("catalog");
  return { ok: true as const };
}

// ── Orders ────────────────────────────────────────────────────
export async function transitionOrderAction(
  orderId: string,
  to: OrderStatus,
) {
  // Cancelling a paid order is a manager/admin action; every other pipeline
  // transition is routine fulfilment work.
  const needed =
    to === OrderStatus.CANCELLED ? PERMISSIONS.ORDERS_CANCEL : PERMISSIONS.ORDERS_FULFILL;
  const user = await authorize(needed);
  if (!user) return DENIED;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false as const, error: "Order not found." };
  if (!ORDER_TRANSITIONS[order.status].includes(to)) {
    return { ok: false as const, error: `Cannot move ${order.status} → ${to}.` };
  }

  // Keep the pipeline in order: an order can only be marked delivered once its
  // shipment has actually shipped.
  if (to === OrderStatus.DELIVERED) {
    const shipped = await prisma.shipment.findFirst({
      where: {
        orderId,
        status: {
          in: [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
        },
      },
      select: { id: true },
    });
    if (!shipped) {
      return { ok: false as const, error: "Mark the order shipped before delivering." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    if (to === OrderStatus.FULFILLED) {
      // "Packed": a shipment is prepared but not yet handed to the carrier.
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
    actorId: user.id,
    action: "order.transition",
    targetType: "Order",
    targetId: orderId,
    diff: { from: order.status, to },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

/**
 * Mark a packed order as shipped: hands the prepared shipment to the carrier and
 * notifies the customer. The order stays FULFILLED; the shipment moves to
 * SHIPPED. Staff-allowed (orders:fulfill).
 */
export async function markOrderShippedAction(orderId: string) {
  const user = await authorize(PERMISSIONS.ORDERS_FULFILL);
  if (!user) return DENIED;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipments: { orderBy: { id: "asc" }, take: 1 } },
  });
  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.status !== OrderStatus.FULFILLED) {
    return { ok: false as const, error: "Pack the order before shipping it." };
  }
  const shipment = order.shipments[0];
  if (!shipment) return { ok: false as const, error: "No shipment to ship." };
  if (shipment.status !== ShipmentStatus.PENDING) {
    return { ok: false as const, error: "This order has already shipped." };
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: ShipmentStatus.SHIPPED, shippedAt: new Date() },
  });
  await logAudit({
    actorId: user.id,
    action: "order.ship",
    targetType: "Order",
    targetId: orderId,
    diff: { shipmentId: shipment.id },
  });
  await notifyOrderShipped(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

/** Full refund — ADMIN only. Restocks items and marks the order REFUNDED. */
export async function refundOrderAction(orderId: string) {
  const user = await authorize(PERMISSIONS.ORDERS_REFUND);
  if (!user) {
    return { ok: false as const, error: "You don't have permission to issue refunds." };
  }
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { where: { status: PaymentStatus.SUCCEEDED }, take: 1 } },
  });
  if (!order) return { ok: false as const, error: "Order not found." };
  const payment = order.payments[0];
  if (!payment) return { ok: false as const, error: "No captured payment to refund." };
  if (order.status === OrderStatus.REFUNDED) {
    return { ok: false as const, error: "Order is already refunded." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        paymentId: payment.id,
        amountMinor: order.totalMinor,
        reason: "Admin full refund",
        status: RefundStatus.SUCCEEDED,
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
    for (const item of order.items) {
      if (!item.variantId) continue; // variant was deleted — can't restock it
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          delta: item.quantity,
          reason: InvReason.RETURN,
          actorId: user.id,
        },
      });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.REFUNDED } });
  });

  await logAudit({
    actorId: user.id,
    action: "order.refund",
    targetType: "Order",
    targetId: orderId,
    diff: { amountMinor: order.totalMinor },
  });
  await notifyOrderRefunded(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

// ── Coupons ───────────────────────────────────────────────────
const couponSchema = z.object({
  code: z.string().trim().min(3).toUpperCase(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.number().int().min(0),
  minSpendMinor: z.number().int().min(0).default(0),
  maxRedemptions: z.number().int().min(0).default(0),
});

export async function createCouponAction(input: unknown) {
  const user = await authorize(PERMISSIONS.COUPONS_MANAGE);
  if (!user) return { ok: false as const, error: "You don't have permission to manage coupons." };
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the coupon fields." };

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { ok: false as const, error: "That code already exists." };

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
    actorId: user.id,
    action: "coupon.create",
    targetType: "Coupon",
    targetId: coupon.id,
    diff: { code: coupon.code },
  });
  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

export async function toggleCouponAction(couponId: string) {
  // Enable/disable an existing coupon — managers/admins (coupons:toggle).
  const user = await authorize(PERMISSIONS.COUPONS_TOGGLE);
  if (!user) return DENIED;
  const c = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!c) return { ok: false as const, error: "Coupon not found." };
  await prisma.coupon.update({ where: { id: couponId }, data: { active: !c.active } });
  await logAudit({
    actorId: user.id,
    action: "coupon.toggle",
    targetType: "Coupon",
    targetId: couponId,
    diff: { active: !c.active },
  });
  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

/** Permanently delete a coupon — admin-only (coupons:manage). */
export async function deleteCouponAction(couponId: string) {
  const user = await authorize(PERMISSIONS.COUPONS_MANAGE);
  if (!user) return DENIED;
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;
  const c = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!c) return { ok: false as const, error: "Coupon not found." };
  try {
    await prisma.coupon.delete({ where: { id: couponId } });
  } catch (error) {
    const e = error as { code?: string };
    // A coupon referenced by past orders can't be hard-deleted (FK). Guide the
    // admin to disable it instead so order history stays intact.
    if (e?.code === "P2003") {
      return {
        ok: false as const,
        error: "This coupon has been used on orders — disable it instead of deleting.",
      };
    }
    return { ok: false as const, error: "Couldn't delete this coupon." };
  }
  await logAudit({
    actorId: user.id,
    action: "coupon.delete",
    targetType: "Coupon",
    targetId: couponId,
    diff: { code: c.code },
  });
  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

// ── Categories ────────────────────────────────────────────────
const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name."),
});

/** Add a catalog category the owner can file products under. */
export async function createCategoryAction(input: unknown) {
  const user = await authorize(PERMISSIONS.CATEGORIES_MANAGE);
  if (!user) return DENIED;

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the name." };
  }
  const { name } = parsed.data;

  const slug = slugify(name) || `category-${randomBytes(3).toString("hex")}`;
  if (await prisma.category.findUnique({ where: { slug } })) {
    return { ok: false as const, error: `A category like “${name}” already exists.` };
  }

  const category = await prisma.category.create({
    data: { name, slug },
    select: { id: true },
  });

  await logAudit({
    actorId: user.id,
    action: "category.create",
    targetType: "Category",
    targetId: category.id,
    diff: { name, slug },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  return { ok: true as const };
}

/**
 * Remove a category. Blocked only while it still holds *live* products — those
 * must be moved or deleted first. Any leftover archived products (permanently
 * deleted items that predate hard-delete) are purged with the category so it
 * doesn't stay pinned by rows the admin can no longer see.
 */
export async function deleteCategoryAction(categoryId: string) {
  const user = await authorize(PERMISSIONS.CATEGORIES_MANAGE);
  if (!user) return DENIED;
  if (isDemoAccount(user.email)) return DEMO_BLOCKED;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  if (!category) return { ok: false as const, error: "Category not found." };
  if (category._count.products > 0) {
    const n = category._count.products;
    return {
      ok: false as const,
      error: `“${category.name}” still has ${n} product${n === 1 ? "" : "s"} — move or delete them first.`,
    };
  }

  // No live products. Purge any archived leftovers, then drop the category, in
  // one batched transaction (single proxy round-trip, executed in array order).
  // Deleting a product cascades to its variants; each variant's order lines
  // keep their snapshot (productName/sku/price) while OrderItem.variantId is
  // nulled by the FK's ON DELETE SET NULL. Wrapped so any residual constraint
  // failure returns a typed error the client already handles, never a 500.
  try {
    await prisma.$transaction([
      prisma.product.deleteMany({
        where: { categoryId, deletedAt: { not: null } },
      }),
      prisma.category.delete({ where: { id: categoryId } }),
    ]);
  } catch (error) {
    const e = error as { code?: string; meta?: unknown; message?: string };
    console.error("category.delete failed", {
      categoryId,
      code: e?.code,
      meta: e?.meta,
      message: e?.message,
    });
    return {
      ok: false as const,
      error: "Couldn't delete this category — it's still referenced by other records.",
    };
  }
  await logAudit({
    actorId: user.id,
    action: "category.delete",
    targetType: "Category",
    targetId: categoryId,
    diff: { name: category.name },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  return { ok: true as const };
}
