-- Keep the public/provider service-type list to exactly two top-level domains.

UPDATE "service_types"
SET "is_active" = false
WHERE "category_id" IN (
  SELECT "id" FROM "categories"
  WHERE "slug" IN ('house-cleaning', 'car-detailing')
);

INSERT INTO "service_types" (
  "id",
  "category_id",
  "name",
  "description",
  "default_duration_min",
  "sort_order",
  "is_active"
)
SELECT gen_random_uuid(), c."id", 'House Cleaning', 'Home cleaning packages for apartments and houses', 180, 1, true
FROM "categories" c
WHERE c."slug" = 'house-cleaning'
ON CONFLICT ("category_id", "name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "default_duration_min" = EXCLUDED."default_duration_min",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;

INSERT INTO "service_types" (
  "id",
  "category_id",
  "name",
  "description",
  "default_duration_min",
  "sort_order",
  "is_active"
)
SELECT gen_random_uuid(), c."id", 'Car Detailing', 'Interior and exterior vehicle detailing packages', 90, 1, true
FROM "categories" c
WHERE c."slug" = 'car-detailing'
ON CONFLICT ("category_id", "name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "default_duration_min" = EXCLUDED."default_duration_min",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;

UPDATE "services"
SET "service_type_id" = (
  SELECT st."id"
  FROM "service_types" st
  JOIN "categories" c ON c."id" = st."category_id"
  WHERE c."slug" = 'house-cleaning' AND st."name" = 'House Cleaning'
  LIMIT 1
)
WHERE "template_key" LIKE 'house-cleaning.%';

UPDATE "services"
SET "service_type_id" = (
  SELECT st."id"
  FROM "service_types" st
  JOIN "categories" c ON c."id" = st."category_id"
  WHERE c."slug" = 'car-detailing' AND st."name" = 'Car Detailing'
  LIMIT 1
)
WHERE "template_key" LIKE 'car-detailing.%';
