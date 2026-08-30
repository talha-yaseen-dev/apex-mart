/**
 * Where a user lands right after signing in, by role:
 *   ADMIN    → /admin            (dashboard: customers, staff, orders — everything)
 *   staff    → /admin/inventory  (stock management)
 *   customer → /                 (storefront — start shopping)
 *
 * Pure and dependency-free so the client sign-in form and any server code can
 * share it. An explicit `callbackUrl` (e.g. redirected from a protected page)
 * takes precedence over this default — see components/auth/sign-in-form.tsx.
 */
export function landingPathFor(user: {
  role: string;
  isEmployee: boolean;
}): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.isEmployee) return "/admin/inventory";
  return "/";
}
