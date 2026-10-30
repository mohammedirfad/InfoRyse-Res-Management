ALTER TABLE "Restaurant"
  ADD COLUMN "upiPaymentId" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "servedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancelledQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Bill"
  ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "Bill_shareToken_key" ON "Bill"("shareToken");
CREATE INDEX "Bill_restaurantId_tableSessionId_idx" ON "Bill"("restaurantId", "tableSessionId");

UPDATE "OrderItem" AS item
SET "servedQuantity" = item."quantity"
FROM "Order" AS ord
WHERE item."orderId" = ord."id" AND ord."status" = 'COMPLETED';

UPDATE "OrderItem" AS item
SET "cancelledQuantity" = item."quantity"
FROM "Order" AS ord
WHERE item."orderId" = ord."id" AND ord."status" = 'CANCELLED';
