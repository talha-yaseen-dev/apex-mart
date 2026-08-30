-- Optional profile picture on User (data URL or image URL). Idempotent; first
-- applied out-of-band on production via the Accelerate proxy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;
