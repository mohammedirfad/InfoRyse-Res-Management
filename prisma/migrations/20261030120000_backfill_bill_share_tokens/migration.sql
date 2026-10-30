-- Give older bills a shareable URL so their digital-bill QR can be generated.
UPDATE "Bill"
SET "shareToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "shareToken" IS NULL;
