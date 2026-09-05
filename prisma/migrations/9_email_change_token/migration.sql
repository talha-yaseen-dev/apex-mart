-- Add the EMAIL_CHANGE purpose to the TokenType enum. This backs the 6-digit
-- verification codes sent to a NEW email address during a Settings → change-email
-- flow (see lib/otp.ts). Purely additive and non-destructive: it introduces a new
-- enum value and touches no existing rows. Safe on PostgreSQL 12+ (Neon) — the
-- new value is only ADDED here, never used within this same transaction.
--
-- NOT applied automatically. Apply to production with:  npx prisma migrate deploy
ALTER TYPE "TokenType" ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE';
