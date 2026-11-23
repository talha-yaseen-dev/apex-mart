/**
 * E2E test-customer seed for the Apex Tyres account area.
 *
 * Creates ONE verified customer + ONE completed COD order so the account
 * mutations (addresses, profile, password, wishlist, return form) can be
 * exercised end-to-end. Idempotent: re-running skips anything that exists, so it
 * won't clobber demo state (e.g. a password changed during testing).
 *
 *   Run: npm run db:seed:e2e
 *
 * The password uses the same argon2id parameters as the runtime hasher
 * (lib/password.ts) so the seeded credential verifies through Nova's normal
 * sign-in path. Clean up the user manually when done demoing.
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaClient, OrderStatus, PaymentStatus, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Kept in sync with lib/password.ts + prisma/seed.ts.
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const EMAIL = "e2etest@apexmart.local";
const PASSWORD = "TestE2E1234!";
const NAME = "E2E Tester";
const PHONE = "+923001112233";

// Rs. 1,500 free-delivery threshold / Rs. 120 flat fee, in paisa (lib/delivery-config).
const FREE_THRESHOLD = 150_000;
const FLAT_FEE = 12_000;

function orderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `APEX-${yy}${mm}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function main() {
  // 1 — verified customer (skip if present)
  let user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (user) {
    console.log(`✓ user ${EMAIL} already exists (${user.id}) — skipping create`);
  } else {
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: NAME,
        phone: PHONE,
        passwordHash: await hash(PASSWORD, ARGON2),
        emailVerified: new Date(),
        role: Role.CUSTOMER,
        isGuest: false,
      },
    });
    console.log(`✓ created verified customer ${EMAIL} (${user.id})`);
  }

  // 2 — one completed COD order (skip if the user already has any)
  const existingOrders = await prisma.order.count({ where: { userId: user.id } });
  if (existingOrders > 0) {
    console.log(`✓ user already has ${existingOrders} order(s) — skipping order create`);
  } else {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, variants: { some: {} } },
      include: { variants: { orderBy: { priceMinor: "asc" }, take: 1 } },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    if (products.length === 0) {
      throw new Error("No active products found — import real tyre inventory first.");
    }

    const qtys = [2, 1];
    const items = products.map((p, i) => {
      const v = p.variants[0];
      return {
        variantId: v.id,
        productName: p.name,
        sku: v.sku,
        unitPriceMinor: v.priceMinor,
        quantity: qtys[i] ?? 1,
      };
    });

    const subtotalMinor = items.reduce((s, it) => s + it.unitPriceMinor * it.quantity, 0);
    const shippingMinor = subtotalMinor >= FREE_THRESHOLD ? 0 : FLAT_FEE;
    const totalMinor = subtotalMinor + shippingMinor;

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        userId: user.id,
        status: OrderStatus.PAID,
        currency: "PKR",
        subtotalMinor,
        discountMinor: 0,
        shippingMinor,
        taxMinor: 0,
        totalMinor,
        items: { create: items },
        payments: {
          create: {
            provider: "cod",
            providerRef: "cod_e2e_seed",
            amountMinor: totalMinor,
            currency: "PKR",
            status: PaymentStatus.SUCCEEDED,
          },
        },
      },
    });
    console.log(
      `✓ created COD order ${order.orderNumber} — ${items.length} lines, total Rs. ${Math.round(
        totalMinor / 100,
      ).toLocaleString("en-PK")}`,
    );
  }

  console.log(`\nSign in with:\n  email:    ${EMAIL}\n  password: ${PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
