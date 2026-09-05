-- Single-admin: make the store admin the primary admin and remove the leftover
-- Nova demo admin. (On a fresh DB the DELETE is a harmless no-op.)

-- Exactly one primary admin: the real store owner account.
UPDATE "User" SET "isPrimaryAdmin" = false WHERE "isPrimaryAdmin" = true;
UPDATE "User" SET "isPrimaryAdmin" = true WHERE "email" = 'admin@apexmart.local';

-- Remove the Nova demo admin (its audit-log actor references are ON DELETE SET NULL).
DELETE FROM "User" WHERE "email" = 'admin@nova.market';
