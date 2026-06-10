-- Focus the marketplace on the two supported service domains and add stable
-- service-matrix metadata for provider pricing grids.

ALTER TABLE "services" ADD COLUMN "template_key" VARCHAR(120);
ALTER TABLE "services" ADD COLUMN "service_key" VARCHAR(100);
ALTER TABLE "services" ADD COLUMN "variant_key" VARCHAR(100);
ALTER TABLE "services" ADD COLUMN "pricing_unit" VARCHAR(20) NOT NULL DEFAULT 'FIXED';
ALTER TABLE "services" ADD COLUMN "is_matrix_managed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "services_template_key_idx" ON "services"("template_key");
CREATE INDEX "services_provider_id_template_key_idx" ON "services"("provider_id", "template_key");

UPDATE "categories"
SET
  "name" = 'House Cleaning',
  "slug" = 'house-cleaning',
  "icon" = '🏠',
  "description" = 'Professional home cleaning for apartments and houses',
  "sort_order" = 1,
  "is_active" = true
WHERE "slug" = 'cleaning';

UPDATE "categories"
SET
  "name" = 'Car Detailing',
  "slug" = 'car-detailing',
  "icon" = '🚗',
  "description" = 'Interior and exterior vehicle detailing services',
  "sort_order" = 2,
  "is_active" = true
WHERE "slug" = 'carwash';

INSERT INTO "categories" ("id", "name", "slug", "icon", "description", "sort_order", "is_active")
SELECT gen_random_uuid(), 'House Cleaning', 'house-cleaning', '🏠', 'Professional home cleaning for apartments and houses', 1, true
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "slug" = 'house-cleaning');

INSERT INTO "categories" ("id", "name", "slug", "icon", "description", "sort_order", "is_active")
SELECT gen_random_uuid(), 'Car Detailing', 'car-detailing', '🚗', 'Interior and exterior vehicle detailing services', 2, true
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "slug" = 'car-detailing');

UPDATE "categories"
SET "is_active" = false
WHERE "slug" NOT IN ('house-cleaning', 'car-detailing');

UPDATE "service_types"
SET "is_active" = false
WHERE "category_id" IN (
  SELECT "id" FROM "categories" WHERE "slug" IN ('house-cleaning', 'car-detailing')
);

UPDATE "service_types"
SET "is_active" = false
WHERE "category_id" IN (
  SELECT "id" FROM "categories" WHERE "slug" NOT IN ('house-cleaning', 'car-detailing')
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
