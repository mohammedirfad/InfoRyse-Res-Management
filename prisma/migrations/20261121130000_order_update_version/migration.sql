ALTER TABLE "Order"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Order_restaurantId_updatedAt_idx"
  ON "Order"("restaurantId", "updatedAt" DESC);

CREATE INDEX "Bill_restaurantId_paymentStatus_paidAt_idx"
  ON "Bill"("restaurantId", "paymentStatus", "paidAt");
