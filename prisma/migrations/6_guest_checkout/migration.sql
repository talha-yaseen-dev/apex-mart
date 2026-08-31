-- Mart Shop guest checkout: phone identity + guest flag on User.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
