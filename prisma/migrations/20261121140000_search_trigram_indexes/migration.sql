CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Order_customerName_trgm_idx"
  ON "Order" USING GIN ("customerName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Order_customerPhone_trgm_idx"
  ON "Order" USING GIN ("customerPhone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "OrderItem_nameSnapshot_trgm_idx"
  ON "OrderItem" USING GIN ("nameSnapshot" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Table_label_trgm_idx"
  ON "Table" USING GIN ("label" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Bill_customerName_trgm_idx"
  ON "Bill" USING GIN ("customerName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Bill_customerPhone_trgm_idx"
  ON "Bill" USING GIN ("customerPhone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Bill_tableLabel_trgm_idx"
  ON "Bill" USING GIN ("tableLabel" gin_trgm_ops);
