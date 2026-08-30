-- Reconcile OrderItem.variantId with schema.prisma.
--
-- The 0_init migration created this column as `TEXT NOT NULL` with a foreign
-- key `ON DELETE RESTRICT`, but schema.prisma declares it nullable with
-- `onDelete: SetNull`. The drift made it impossible to delete a product (or an
-- empty category holding archived products) once its variants had been ordered.
--
-- Target state: nullable column + FK `ON DELETE SET NULL`, so deleting a
-- variant nulls the order line while its snapshot columns (productName, sku,
-- unitPriceMinor) preserve the order history. Written idempotently because it
-- was first applied out-of-band on production (Accelerate proxy blocks
-- `prisma migrate deploy`, which needs a direct connection URL).
ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_variantId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
