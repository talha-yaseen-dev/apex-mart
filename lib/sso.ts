import "server-only";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * SSO / SCIM directory seam.
 *
 * In a large company the identity provider (Okta, Google Workspace, Entra ID)
 * is the source of truth for *who is an employee* and *what roles they hold*.
 * On sign-in you reconcile the local mirror against the IdP over SCIM: set
 * `isEmployee` / `role` and deprovision leavers. Employee identity is
 * intentionally separate from customer profile data.
 *
 * This is a local no-op stub so the credentials flow keeps working — the DB
 * mirror is treated as already in sync. To wire a real provider, implement
 * `fetchDirectoryProfile(email)` and reconcile `isEmployee` + assignments here.
 */
export async function syncEmployeeDirectory(email: string): Promise<void> {
  // const profile = await fetchDirectoryProfile(email);   // Okta/SCIM call
  // await reconcile(email, profile);                       // isEmployee + roles
  void email; // no-op in local/dev
}

/**
 * First-admin bootstrap.
 *
 * Before any admin exists there's no one to grant access through the UI, so the
 * deployer names their own address in `BOOTSTRAP_ADMIN_EMAIL`. That account is
 * promoted to admin on sign-in (idempotent) — a terminal-free way to seed the
 * very first admin, and a break-glass recovery if every admin is ever removed.
 * Because only whoever controls the deployment env can set it, this is the same
 * trust level as direct database access.
 *
 * Returns the effective directory fields when it acted on this account, so the
 * session reflects the promotion immediately; null otherwise.
 */
export async function ensureBootstrapAdmin(
  email: string,
): Promise<{ role: Role; isEmployee: boolean } | null> {
  const target = env.BOOTSTRAP_ADMIN_EMAIL;
  if (!target || email.trim().toLowerCase() !== target) return null;

  const user = await prisma.user.findUnique({ where: { email: target } });
  if (!user) return null;

  if (user.role !== Role.ADMIN || !user.isEmployee) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN, isEmployee: true },
    });
  }

  // ADMIN role carries the SUPER permission (lib/permissions.ts) — no role
  // assignment needed.
  return { role: Role.ADMIN, isEmployee: true };
}
