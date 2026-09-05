/**
 * Make a real person the single Apex Mart admin, and retire the seeded
 * placeholder admin (admin@apexmart.local).
 *
 * What it does, in one transaction:
 *   1. Promotes the target account (default talhayaseen176@gmail.com) to
 *      role=ADMIN, isEmployee=true, isPrimaryAdmin=true, verified + reactivated.
 *      The account must already exist (sign in once — email or Google — first).
 *   2. Strips primary-admin from everyone else, then retires the old seeded
 *      admin: deleted outright if it has no orders/records, otherwise demoted to
 *      a deactivated CUSTOMER (so historical rows keep their foreign keys).
 *
 * Idempotent — safe to run more than once. Run against the SAME database the
 * app uses (production = your Neon URL):
 *
 *   npm run db:set:admin                      # promotes the default email
 *   npm run db:set:admin -- someone@else.com  # promotes a different email
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_EMAIL = (process.argv[2] ?? "talhayaseen176@gmail.com").toLowerCase().trim();
const OLD_ADMIN_EMAIL = "admin@apexmart.local";

async function main() {
  const target = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!target) {
    throw new Error(
      `No account found for ${TARGET_EMAIL}. Sign in once (email or Google) to ` +
        `create the account, then re-run this script.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1 — make the target the single primary admin.
    await tx.user.update({
      where: { id: target.id },
      data: {
        role: Role.ADMIN,
        isEmployee: true,
        isPrimaryAdmin: true,
        isGuest: false,
        deactivatedAt: null,
        emailVerified: target.emailVerified ?? new Date(),
      },
    });

    // 2 — nobody else may be primary admin.
    await tx.user.updateMany({
      where: { id: { not: target.id }, isPrimaryAdmin: true },
      data: { isPrimaryAdmin: false },
    });

    // 3 — retire the seeded placeholder admin, if present and not the target.
    if (OLD_ADMIN_EMAIL !== TARGET_EMAIL) {
      const old = await tx.user.findUnique({
        where: { email: OLD_ADMIN_EMAIL },
        include: { _count: { select: { orders: true, addresses: true, reviews: true } } },
      });
      if (old) {
        const hasHistory =
          old._count.orders > 0 || old._count.addresses > 0 || old._count.reviews > 0;
        if (hasHistory) {
          // Keep the row so its foreign keys stay valid — just neutralise it.
          await tx.user.update({
            where: { id: old.id },
            data: {
              role: Role.CUSTOMER,
              isEmployee: false,
              isPrimaryAdmin: false,
              deactivatedAt: new Date(),
            },
          });
          console.log(`↩︎  ${OLD_ADMIN_EMAIL} has history — demoted + deactivated (not deleted).`);
        } else {
          await tx.user.delete({ where: { id: old.id } });
          console.log(`🗑️   Deleted seeded admin ${OLD_ADMIN_EMAIL}.`);
        }
      }
    }
  });

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isEmployee: true },
    select: { email: true, isPrimaryAdmin: true },
    orderBy: { isPrimaryAdmin: "desc" },
  });
  console.log(`✅  ${TARGET_EMAIL} is now the primary admin.`);
  console.log("Current admins:", admins);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
