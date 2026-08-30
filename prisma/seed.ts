import { hash } from "@node-rs/argon2";
import { PrismaClient, ProductStatus, Role } from "@prisma/client";
import { PERMISSION_DESCRIPTIONS, ROLE_CATALOG } from "../lib/rbac-catalog";

const prisma = new PrismaClient();

/** Argon2id parameters — shared with the runtime auth hasher (Phase 2). */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const img = (slug: string, n = 1) =>
  `https://picsum.photos/seed/${slug}-${n}/800/800`;

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  { slug: "audio-tech", name: "Audio & Tech" },
  { slug: "home-outdoors", name: "Home & Outdoors" },
  { slug: "apparel-footwear", name: "Apparel & Footwear" },
];

// ── Products (10) with variants ───────────────────────────────
// priceMinor is in integer cents.
type Seed = {
  slug: string;
  name: string;
  category: string;
  variants: { sku: string; priceMinor: number; stock: number; attributes: Record<string, string> }[];
};

const PRODUCTS: Seed[] = [
  {
    slug: "aurora-headphones",
    name: "Aurora Wireless Headphones",
    category: "audio-tech",
    variants: [
      { sku: "AUR-BLK", priceMinor: 24900, stock: 42, attributes: { color: "Midnight Black" } },
      { sku: "AUR-SLV", priceMinor: 24900, stock: 18, attributes: { color: "Silver" } },
    ],
  },
  {
    slug: "meridian-keyboard",
    name: "Meridian Mechanical Keyboard",
    category: "audio-tech",
    variants: [
      { sku: "MER-BRN", priceMinor: 15900, stock: 30, attributes: { switch: "Tactile Brown" } },
      { sku: "MER-RED", priceMinor: 15900, stock: 12, attributes: { switch: "Linear Red" } },
    ],
  },
  {
    slug: "pulse-earbuds",
    name: "Pulse Wireless Earbuds",
    category: "audio-tech",
    variants: [{ sku: "PUL-WHT", priceMinor: 8900, stock: 64, attributes: { color: "White" } }],
  },
  {
    slug: "volta-desk-lamp",
    name: "Volta LED Desk Lamp",
    category: "audio-tech",
    variants: [{ sku: "VOL-GRY", priceMinor: 7900, stock: 25, attributes: { color: "Graphite" } }],
  },
  {
    slug: "cascade-bottle",
    name: "Cascade Insulated Bottle",
    category: "home-outdoors",
    variants: [
      { sku: "CAS-500", priceMinor: 3700, stock: 120, attributes: { size: "500 ml", color: "Slate" } },
      { sku: "CAS-750", priceMinor: 4200, stock: 80, attributes: { size: "750 ml", color: "Slate" } },
    ],
  },
  {
    slug: "horizon-backpack",
    name: "Horizon Daypack 22L",
    category: "home-outdoors",
    variants: [{ sku: "HOR-OLV", priceMinor: 13900, stock: 34, attributes: { color: "Olive" } }],
  },
  {
    slug: "ember-mug",
    name: "Ember Ceramic Mug",
    category: "home-outdoors",
    variants: [{ sku: "EMB-CLY", priceMinor: 2200, stock: 200, attributes: { color: "Clay" } }],
  },
  {
    slug: "summit-trail-runners",
    name: "Summit Trail Runners",
    category: "apparel-footwear",
    variants: [
      { sku: "SUM-09", priceMinor: 11900, stock: 20, attributes: { size: "US 9" } },
      { sku: "SUM-10", priceMinor: 11900, stock: 22, attributes: { size: "US 10" } },
      { sku: "SUM-11", priceMinor: 11900, stock: 9, attributes: { size: "US 11" } },
    ],
  },
  {
    slug: "nimbus-jacket",
    name: "Nimbus Down Jacket",
    category: "apparel-footwear",
    variants: [
      { sku: "NIM-M", priceMinor: 22900, stock: 15, attributes: { size: "M", color: "Navy" } },
      { sku: "NIM-L", priceMinor: 22900, stock: 11, attributes: { size: "L", color: "Navy" } },
    ],
  },
  {
    slug: "drift-merino-socks",
    name: "Drift Merino Socks",
    category: "apparel-footwear",
    variants: [{ sku: "DRF-OS", priceMinor: 1800, stock: 300, attributes: { size: "One size" } }],
  },
];

const COUPONS = [
  { code: "WELCOME10", type: "PERCENT" as const, value: 10, maxRedemptions: 1000 },
  { code: "FREESHIP", type: "FREE_SHIPPING" as const, value: 0, maxRedemptions: 500 },
  { code: "SAVE15", type: "FIXED" as const, value: 1500, maxRedemptions: 200 },
];

const REVIEWERS = [
  { email: "dana@example.com", name: "Dana Kessler" },
  { email: "marcus@example.com", name: "Marcus Lee" },
  { email: "priya@example.com", name: "Priya Nair" },
  { email: "sofia@example.com", name: "Sofia Duarte" },
  { email: "omar@example.com", name: "Omar Haddad" },
];

const REVIEW_POOL = [
  { rating: 5, title: "Exactly as described", body: "Shipped fast and the quality is better than I expected at this price. Would buy again." },
  { rating: 5, title: "Worth every cent", body: "Been using it daily for a month with zero complaints. Build feels premium and solid." },
  { rating: 4, title: "Great, one small nit", body: "Really happy overall. Knocked a star because setup took a minute, but it works beautifully." },
  { rating: 5, title: "Highly recommend", body: "Gifted one and immediately ordered a second for myself. That good." },
  { rating: 4, title: "Solid choice", body: "Does everything it promises. Packaging was tidy and delivery was on time." },
];

async function main() {
  console.log("🌱  Seeding Nova…");

  // Sample catalog is opt-in. On a real/portfolio deployment we seed only the
  // scaffolding (users, roles, coupons) and let the owner add their own
  // categories and products from the admin (Admin → Categories, then Add
  // product). Set SEED_SAMPLE_PRODUCTS=true for a populated local demo.
  // Categories are seeded only alongside the sample products that belong to
  // them, so a fresh setup ships with no default categories.
  const withSampleProducts = process.env.SEED_SAMPLE_PRODUCTS === "true";

  // ── Users ───────────────────────────────────────────────────
  // Seeded accounts are pre-verified (emailVerified set) so they can sign in
  // immediately — the credentials flow blocks unverified emails. Re-running the
  // seed re-sets the admin password.
  //
  // Fixed, known value so the sign-in screen's demo hint (admin@nova.market /
  // demo1234) actually works: this is a public portfolio demo where visitors are
  // meant to explore the admin panel. Kept in sync with the hint in
  // components/auth/sign-in-form.tsx.
  const adminPassword = "demo1234";
  const adminHash = await hash(adminPassword, ARGON2);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nova.market" },
    update: {
      role: Role.ADMIN,
      isEmployee: true,
      emailVerified: new Date(),
      passwordHash: adminHash,
    },
    create: {
      email: "admin@nova.market",
      name: "Nova Admin",
      role: Role.ADMIN,
      isEmployee: true,
      emailVerified: new Date(),
      passwordHash: adminHash,
    },
  });

  // A STAFF employee for demoing Just-In-Time elevation (baseline can't refund).
  const staffHash = await hash("password", ARGON2);
  const staff = await prisma.user.upsert({
    where: { email: "staff@nova.market" },
    update: { role: Role.STAFF, isEmployee: true, emailVerified: new Date(), passwordHash: staffHash },
    create: {
      email: "staff@nova.market",
      name: "Sam Staff",
      role: Role.STAFF,
      isEmployee: true,
      emailVerified: new Date(),
      passwordHash: staffHash,
    },
  });

  // A MANAGER: STAFF baseline plus the standing `manager` role — full operations
  // access (publish, pricing, refunds, cancellations, categories, coupons,
  // reports, customers) without the admin-only powers (permanent deletes, access
  // management, payment/security settings). Assigned below.
  const managerHash = await hash("password", ARGON2);
  const manager = await prisma.user.upsert({
    where: { email: "manager@nova.market" },
    update: { role: Role.STAFF, isEmployee: true, emailVerified: new Date(), passwordHash: managerHash },
    create: {
      email: "manager@nova.market",
      name: "Morgan Manager",
      role: Role.STAFF,
      isEmployee: true,
      emailVerified: new Date(),
      passwordHash: managerHash,
    },
  });

  const demoHash = await hash("password", ARGON2);
  await prisma.user.upsert({
    where: { email: "demo@nova.market" },
    update: { emailVerified: new Date(), passwordHash: demoHash },
    create: {
      email: "demo@nova.market",
      name: "Jordan Demo",
      role: Role.CUSTOMER,
      emailVerified: new Date(),
      passwordHash: demoHash,
    },
  });

  // ── Access control: permission + role catalog, then assignments ──
  const permIds = new Map<string, string>();
  for (const [key, description] of Object.entries(PERMISSION_DESCRIPTIONS)) {
    const p = await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
    permIds.set(key, p.id);
  }
  const roleIds = new Map<string, string>();
  for (const [name, def] of Object.entries(ROLE_CATALOG)) {
    const role = await prisma.appRole.upsert({
      where: { name },
      update: { description: def.description, selfRequestable: def.selfRequestable },
      create: { name, description: def.description, selfRequestable: def.selfRequestable },
    });
    roleIds.set(name, role.id);
    for (const key of def.permissions) {
      const permissionId = permIds.get(key)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
  // Standing assignments: admin → admin role, staff → fulfillment role.
  const ensureAssignment = async (userId: string, roleName: string) => {
    const roleId = roleIds.get(roleName)!;
    const existing = await prisma.roleAssignment.findFirst({
      where: { userId, roleId, expiresAt: null },
    });
    if (!existing) {
      await prisma.roleAssignment.create({ data: { userId, roleId, reason: "Seeded" } });
    }
  };
  await ensureAssignment(admin.id, "admin");
  await ensureAssignment(staff.id, "fulfillment");
  await ensureAssignment(manager.id, "manager");

  // ── Categories ──────────────────────────────────────────────
  // Only seeded with the sample catalog; a fresh setup starts with none, and
  // the owner adds their own in Admin → Categories.
  const catBySlug = new Map<string, string>();
  for (const c of withSampleProducts ? CATEGORIES : []) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    catBySlug.set(c.slug, row.id);
  }

  // ── Products, variants, images ──────────────────────────────
  const productIds: string[] = [];
  for (const p of withSampleProducts ? PRODUCTS : []) {
    const categoryId = catBySlug.get(p.category)!;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, categoryId, status: ProductStatus.ACTIVE },
      create: {
        slug: p.slug,
        name: p.name,
        categoryId,
        status: ProductStatus.ACTIVE,
      },
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { priceMinor: v.priceMinor, stock: v.stock, attributes: v.attributes },
        create: { ...v, productId: product.id },
      });
    }

    // Re-seed images deterministically.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: [1, 2].map((n) => ({
        productId: product.id,
        url: img(p.slug, n),
        alt: `${p.name} — view ${n}`,
        position: n - 1,
      })),
    });
    productIds.push(product.id);
  }

  // ── Reviewers + reviews ─────────────────────────────────────
  const reviewerIds: string[] = [];
  for (const r of withSampleProducts ? REVIEWERS : []) {
    const u = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        email: r.email,
        name: r.name,
        role: Role.CUSTOMER,
        emailVerified: new Date(),
        passwordHash: await hash("password", ARGON2),
      },
    });
    reviewerIds.push(u.id);
  }

  for (let pi = 0; pi < productIds.length; pi++) {
    const productId = productIds[pi]!;
    const n = 2 + (pi % 4); // 2–5 reviews per product
    for (let k = 0; k < n; k++) {
      const userId = reviewerIds[(pi + k) % reviewerIds.length]!;
      const r = REVIEW_POOL[(pi + k) % REVIEW_POOL.length]!;
      await prisma.review.upsert({
        where: { productId_userId: { productId, userId } },
        update: {},
        create: { productId, userId, rating: r.rating, title: r.title, body: r.body },
      });
    }
  }

  // ── Coupons ─────────────────────────────────────────────────
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { type: c.type, value: c.value, maxRedemptions: c.maxRedemptions },
      create: c,
    });
  }

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    reviews: await prisma.review.count(),
    coupons: await prisma.coupon.count(),
  };

  console.log("✅  Seed complete:", counts);
  console.log("\n──────────────────────────────────────────");
  console.log(`   Admin login:  ${admin.email}`);
  console.log(`   Admin passwd: ${adminPassword}`);
  console.log(`   Manager login: manager@nova.market / password  (MANAGER — full operations)`);
  console.log(`   Staff login:  staff@nova.market / password  (STAFF — try JIT elevation)`);
  console.log(`   Demo login:   demo@nova.market / password`);
  console.log("──────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
