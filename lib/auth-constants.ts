/**
 * Client-safe auth constants. Kept separate from lib/auth.ts (which pulls in
 * argon2/Prisma/Redis) so client components can import these without dragging
 * server-only, native modules into the browser bundle.
 */
export const AUTH_ERRORS = {
  RATE_LIMITED: "RATE_LIMITED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  DEACTIVATED: "DEACTIVATED",
} as const;

/**
 * Shared demo accounts on the public portfolio deployment. Their passwords are
 * fixed and printed on the sign-in screen so any visitor can sign in and
 * explore. See DEMO_ACCOUNT_LOCK_MESSAGE / the README "Demo accounts" note for
 * why password changes are refused for these.
 */
export const DEMO_ACCOUNT_EMAILS = [
  "admin@nova.market",
  "staff@nova.market",
  "demo@nova.market",
] as const;

export const DEMO_ACCOUNT_LOCK_MESSAGE =
  "This is a shared demo account, so its password is fixed and can’t be changed.";

/**
 * Shown when a shared demo account attempts a destructive or privileged action.
 * The public demo can browse, create, and edit freely, but irreversible or
 * account-impacting operations (deletes, refunds, and team/role changes) are
 * refused so an anonymous visitor can't damage the live showcase data.
 */
export const DEMO_ACCOUNT_WRITE_BLOCK_MESSAGE =
  "This is a shared demo — deletions, refunds, and team changes are disabled here.";

/** True for a shared demo account whose password is locked. */
export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (DEMO_ACCOUNT_EMAILS as readonly string[]).includes(normalized);
}
