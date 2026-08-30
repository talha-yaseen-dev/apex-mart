-- Optional manufacturer/brand on Product (e.g. "Samsung", "Apple"). Idempotent;
-- can be applied out-of-band on production via the Accelerate proxy.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;
