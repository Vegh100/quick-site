-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "scheduled_end_time" VARCHAR(5);

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "service_type_id" UUID,
ADD COLUMN     "slot_interval_min" INTEGER NOT NULL DEFAULT 60,
ALTER COLUMN "price_type" SET DEFAULT 'FIXED';

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "default_duration_min" INTEGER NOT NULL DEFAULT 60,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_types_category_id_idx" ON "service_types"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_category_id_name_key" ON "service_types"("category_id", "name");

-- CreateIndex
CREATE INDEX "services_service_type_id_idx" ON "services"("service_type_id");

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
