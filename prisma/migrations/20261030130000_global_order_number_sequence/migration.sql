CREATE SEQUENCE "GlobalOrderNumberSequence" AS BIGINT START WITH 1;

SELECT setval(
  '"GlobalOrderNumberSequence"',
  GREATEST(COALESCE((SELECT MAX("orderNumber") FROM "Order"), 0) + 1, 1),
  false
);
