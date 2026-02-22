-- CreateTable
CREATE TABLE "service_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,

    CONSTRAINT "service_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_slots_member_id_service_id_day_of_week_idx" ON "service_slots"("member_id", "service_id", "day_of_week");

-- CreateIndex
CREATE INDEX "service_slots_service_id_idx" ON "service_slots"("service_id");

-- AddForeignKey
ALTER TABLE "service_slots" ADD CONSTRAINT "service_slots_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "provider_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_slots" ADD CONSTRAINT "service_slots_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
