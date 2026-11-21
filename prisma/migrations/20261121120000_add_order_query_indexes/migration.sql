-- Support the newest-order admin queries and per-table session order listing.
CREATE INDEX "Order_restaurantId_createdAt_idx"
  ON "Order"("restaurantId", "createdAt");

CREATE INDEX "Order_tableSessionId_createdAt_idx"
  ON "Order"("tableSessionId", "createdAt");
