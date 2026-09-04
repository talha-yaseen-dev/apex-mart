/**
 * Seed the single Apex Mart admin.
 *
 * Apex Mart runs with one internal operator (see the single-admin scope: the
 * Team & Access page is hidden from the admin nav). This seeds that one account
 * so the admin panel is reachable in dev/staging without wiring SSO.
 *
 * The guard on /admin is two-part, and both fields below must be right:
 *   - middleware.ts gates the route on `isEmployee === true`
 *   - role ADMIN grants the SUPER permission (lib/permissions.ts), which
 *     `hasPermission` treats as "all permissions" — so every admin feature and
 *     nav item is available without any RoleAssignment.
 *
 * Idempotent: if a user with this email already exists, it is left untouched
 * (no password reset, no field overwrite) and the script reports "skipped".
 *
 * Run with:  npm run db:seed:admin
 */
import { hash } from "@node-rs/argon2";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/** Argon2id parameters — shared with the runtime hasher (lib/password.ts). */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const ADMIN_EMAIL = "admin@mart.local";
const ADMIN_PASSWORD = "MartAdmin1234!";
const ADMIN_NAME = "Store Admin";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(
      `↩︎  Admin ${ADMIN_EMAIL} already exists (id ${existing.id}) — skipped ` +
        `(role=${existing.role}, isEmployee=${existing.isEmployee}). ` +
        `Password and fields left untouched.`,
    );
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: Role.ADMIN,
      isEmployee: true,
      isGuest: false,
      emailVerified: new Date(), // pre-verified so the account can sign in
      passwordHash: await hash(ADMIN_PASSWORD, ARGON2),
    },
  });

  console.log(
    `✅  Created admin ${user.email} (id ${user.id}) — ` +
      `role=${user.role}, isEmployee=${user.isEmployee}, isGuest=${user.isGuest}, ` +
      `emailVerified=${user.emailVerified?.toISOString()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
