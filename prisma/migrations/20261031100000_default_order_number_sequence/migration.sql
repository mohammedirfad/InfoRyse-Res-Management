ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT nextval('"GlobalOrderNumberSequence"'::regclass);
