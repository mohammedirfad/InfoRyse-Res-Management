-- Consolidate already duplicated active category names while preserving items.
WITH ranked AS (
  SELECT "id",
         FIRST_VALUE("id") OVER (
           PARTITION BY "restaurantId", LOWER(BTRIM("name"))
           ORDER BY "position", "id"
         ) AS canonical_id,
         ROW_NUMBER() OVER (
           PARTITION BY "restaurantId", LOWER(BTRIM("name"))
           ORDER BY "position", "id"
         ) AS duplicate_rank
  FROM "Category"
  WHERE "deletedAt" IS NULL
), moved AS (
  UPDATE "MenuItem" AS item
  SET "categoryId" = ranked.canonical_id
  FROM ranked
  WHERE item."categoryId" = ranked."id"
    AND ranked.duplicate_rank > 1
  RETURNING item."categoryId"
)
UPDATE "Category" AS category
SET "deletedAt" = NOW(), "isActive" = FALSE
FROM ranked
WHERE category."id" = ranked."id"
  AND ranked.duplicate_rank > 1;

-- A deleted category can be recreated later, while concurrent active creates
-- with different capitalization/spacing still cannot produce duplicates.
CREATE UNIQUE INDEX "Category_restaurantId_active_name_lower_key"
ON "Category" ("restaurantId", LOWER(BTRIM("name")))
WHERE "deletedAt" IS NULL;

-- Repair duplicate table labels from repeated/overlapping bulk submissions.
WITH ranked AS (
  SELECT "id", "label",
         ROW_NUMBER() OVER (
           PARTITION BY "restaurantId", "label"
           ORDER BY "createdAt", "id"
         ) AS duplicate_rank
  FROM "Table"
)
UPDATE "Table" AS table_row
SET "label" = table_row."label" || '-' || SUBSTRING(REPLACE(table_row."id", '-', '') FROM 1 FOR 6)
FROM ranked
WHERE table_row."id" = ranked."id"
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX "Table_restaurantId_label_key"
ON "Table" ("restaurantId", "label");

-- Reserve order numbers atomically per restaurant. The reservation update runs
-- outside the order transaction so concurrent restaurant orders don't hold a
-- counter lock while order items and history rows are inserted.
ALTER TABLE "Restaurant" ADD COLUMN "nextOrderNumber" INTEGER NOT NULL DEFAULT 1;
UPDATE "Restaurant" AS restaurant
SET "nextOrderNumber" = COALESCE((
  SELECT MAX("orderNumber") + 1 FROM "Order" WHERE "restaurantId" = restaurant."id"
), 1);

-- Covers the public catalog's category-scoped active item lookup and sort.
CREATE INDEX "MenuItem_categoryId_deletedAt_createdAt_idx"
ON "MenuItem" ("categoryId", "deletedAt", "createdAt");
