import "server-only";
import { OrderStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TYRE_CATEGORY_SLUGS } from "@/lib/tyres";
import { formatVariantLabel } from "@/lib/variant-label";

const PAID_STATES = [
  OrderStatus.PAID,
  OrderStatus.FULFILLED,
  OrderStatus.DELIVERED,
];
const LOW_STOCK = 10;

// ── Dashboard ─────────────────────────────────────────────────
export async function getDashboard() {
  const [revenue, orderCount, pendingCount, lowStock, recent, lowStockList] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: PAID_STATES } },
        _sum: { totalMinor: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.productVariant.count({ where: { stock: { lt: LOW_STOCK }, priceMinor: { gt: 0 }, product: { status: "ACTIVE", deletedAt: null, category: { slug: { in: [...TYRE_CATEGORY_SLUGS] } } } } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { name: true } } },
      }),
      prisma.productVariant.findMany({
        where: { stock: { lt: LOW_STOCK }, priceMinor: { gt: 0 }, product: { status: "ACTIVE", deletedAt: null, category: { slug: { in: [...TYRE_CATEGORY_SLUGS] } } } },
        orderBy: { stock: "asc" },
        take: 6,
        include: { product: { select: { name: true } } },
      }),
    ]);

  return {
    revenueMinor: revenue._sum.totalMinor ?? 0,
    orderCount,
    pendingCount,
    lowStockCount: lowStock,
    recent: recent.map((o) => ({
      id: o.id,
      number: o.orderNumber,
      customer: o.user.name,
      status: o.status,
      totalMinor: o.totalMinor,
      date: o.createdAt,
    })),
    lowStock: lowStockList.map((v) => ({
      id: v.id,
      name: v.product.name,
      sku: v.sku,
      stock: v.stock,
    })),
  };
}

// ── Products ──────────────────────────────────────────────────
export async function getAdminProducts(query = "") {
  // Includes archived products (deletedAt set) so admins can see and restore
  // them; active products are listed first, archived last.
  const products = await prisma.product.findMany({
    where: query ? { name: { contains: query, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      variants: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      _count: { select: { variants: true, images: true } },
    },
  });
  // Active first, archived last (each already newest-first from the query).
  products.sort((a, b) => Number(a.deletedAt !== null) - Number(b.deletedAt !== null));
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category.name,
    status: p.status,
    archived: p.deletedAt !== null,
    image: p.images[0]?.url ?? null,
    imageCount: p._count.images,
    variantCount: p._count.variants,
    stock: p.variants.reduce((s, v) => s + v.stock, 0),
    loMinor: p.variants.length ? Math.min(...p.variants.map((v) => v.priceMinor)) : 0,
    hiMinor: p.variants.length ? Math.max(...p.variants.map((v) => v.priceMinor)) : 0,
  }));
}

/** Categories for the "add product" form select. */
export function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

/** Categories with product counts for the admin Categories manager. */
export async function getAdminCategories() {
  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      // Match the products list, which hides archived products.
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
  }));
}
export type AdminCategory = Awaited<ReturnType<typeof getAdminCategories>>[number];

export async function getAdminProduct(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: { sku: "asc" } },
      images: { orderBy: { position: "asc" }, select: { url: true } },
    },
  });
  if (!p) return null;
  const categories = await prisma.category.findMany({
    where: { slug: { in: [...TYRE_CATEGORY_SLUGS] } },
    orderBy: { name: "asc" },
  });
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    slug: p.slug,
    status: p.status,
    categoryId: p.categoryId,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    images: p.images.map((img) => img.url),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      priceMinor: v.priceMinor,
      stock: v.stock,
      label: formatVariantLabel(v.attributes),
    })),
  };
}

// ── Inventory ─────────────────────────────────────────────────
export async function getInventory() {
  const variants = await prisma.productVariant.findMany({
    where: { product: { status: "ACTIVE", deletedAt: null, category: { slug: { in: [...TYRE_CATEGORY_SLUGS] } } } },
    orderBy: { stock: "asc" },
    include: { product: { select: { name: true } } },
  });
  const now = new Date();
  const reservations = await prisma.stockReservation.groupBy({
    by: ["variantId"],
    where: { expiresAt: { gt: now } },
    _sum: { qty: true },
  });
  const reserved = new Map(reservations.map((r) => [r.variantId, r._sum.qty ?? 0]));
  return variants.map((v) => ({
    id: v.id,
    name: v.product.name,
    label: formatVariantLabel(v.attributes),
    priceConfirmed: v.priceMinor > 0,
    sku: v.sku,
    stock: v.stock,
    reserved: reserved.get(v.id) ?? 0,
  }));
}

// ── Orders ────────────────────────────────────────────────────
export async function getAdminOrders(filter = "ALL", query = "") {
  const conditions: Prisma.OrderWhereInput[] = [];
  if (filter !== "ALL" && filter in OrderStatus) {
    conditions.push({ status: filter as OrderStatus });
  }
  const q = query.trim();
  if (q) {
    // Search by order number, or the customer's name / email.
    conditions.push({
      OR: [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const orders = await prisma.order.findMany({
    where: conditions.length ? { AND: conditions } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
  });
  return orders.map((o) => ({
    id: o.id,
    number: o.orderNumber,
    customer: o.user.name,
    email: o.user.email,
    date: o.createdAt,
    status: o.status,
    totalMinor: o.totalMinor,
    itemCount: o._count.items,
  }));
}

export async function getAdminOrder(id: string) {
  const o = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: true,
      payments: true,
      shipments: true,
      coupon: true,
    },
  });
  if (!o) return null;
  return o;
}

// ── Customers ─────────────────────────────────────────────────
export async function getCustomers() {
  const users = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
      orders: { where: { status: { in: PAID_STATES } }, select: { totalMinor: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    orders: u._count.orders,
    ltvMinor: u.orders.reduce((s, o) => s + o.totalMinor, 0),
    joined: u.createdAt,
    deactivated: Boolean(u.deactivatedAt),
  }));
}

// ── Coupons ───────────────────────────────────────────────────
export async function getAdminCoupons() {
  return prisma.coupon.findMany({ orderBy: { code: "asc" } });
}

// ── Reports ───────────────────────────────────────────────────
export async function getReports() {
  const [agg, byStatus, topProducts] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: PAID_STATES } },
      _sum: { totalMinor: true, taxMinor: true, shippingMinor: true, discountMinor: true },
      _count: true,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 6,
    }),
  ]);
  const orders = agg._count || 0;
  const revenue = agg._sum.totalMinor ?? 0;
  return {
    revenueMinor: revenue,
    orders,
    aovMinor: orders ? Math.round(revenue / orders) : 0,
    taxMinor: agg._sum.taxMinor ?? 0,
    shippingMinor: agg._sum.shippingMinor ?? 0,
    discountMinor: agg._sum.discountMinor ?? 0,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    topProducts: topProducts.map((t) => ({ name: t.productName, qty: t._sum.quantity ?? 0 })),
  };
}

// ── Audit log ─────────────────────────────────────────────────
export async function getAuditLog(limit = 100) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    diff: r.diff,
    createdAt: r.createdAt,
    actor: r.actor?.name ?? "system",
  }));
}

// ── Status transition rules ───────────────────────────────────
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.FULFILLED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  FULFILLED: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};
