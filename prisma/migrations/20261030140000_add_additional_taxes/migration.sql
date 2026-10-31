ALTER TABLE "Restaurant" ADD COLUMN "additionalTaxes" JSONB;
ALTER TABLE "Bill" ADD COLUMN "taxBreakdown" JSONB;
