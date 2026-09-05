-- Collapse account model to two types only: CUSTOMER and ADMIN.
-- Removes the roles-as-data RBAC (Permission / AppRole / RolePermission /
-- RoleAssignment) and the STAFF enum value.

-- 1. Delete STAFF accounts (verified: they hold no orders/addresses/reviews;
--    their role assignments cascade). Admins and customers are untouched.
DELETE FROM "User" WHERE "role" = 'STAFF';

-- 2. Drop the RBAC tables (children first for FK order).
DROP TABLE IF EXISTS "RoleAssignment";
DROP TABLE IF EXISTS "RolePermission";
DROP TABLE IF EXISTS "AppRole";
DROP TABLE IF EXISTS "Permission";

-- 3. Remove STAFF from the Role enum (no rows reference it after step 1).
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
DROP TYPE "Role_old";
