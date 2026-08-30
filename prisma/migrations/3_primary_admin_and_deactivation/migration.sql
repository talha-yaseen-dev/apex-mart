-- Primary (owner) admin + account deactivation.
--
-- isPrimaryAdmin: the single owner admin who outranks other admins, can
--   transfer this status, and can deactivate any account.
-- deactivatedAt: when set, sign-in is refused and protected areas reject the
--   account (reversible).
--
-- Idempotent (first applied out-of-band on production via the Accelerate
-- proxy, which blocks `prisma migrate deploy`). Designating the initial primary
-- admin is a data step handled by the setup route, not this migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPrimaryAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
