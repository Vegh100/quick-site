-- Add member_id to service_slots (per-member-per-service slots)

-- Step 1: Add member_id as nullable
ALTER TABLE "service_slots" ADD COLUMN "member_id" UUID;

-- Step 2: Populate member_id from the first active member assigned to each service
UPDATE "service_slots" ss
SET "member_id" = (
  SELECT pm.id 
  FROM "provider_members" pm
  JOIN "member_services" ms ON ms."member_id" = pm.id
  WHERE ms."service_id" = ss."service_id" AND pm."status" = 'ACTIVE'
  LIMIT 1
);

-- Step 3: Delete any slots that couldn't find a member (orphaned)
DELETE FROM "service_slots" WHERE "member_id" IS NULL;

-- Step 4: Make member_id NOT NULL
ALTER TABLE "service_slots" ALTER COLUMN "member_id" SET NOT NULL;

-- Step 5: Add FK constraint
ALTER TABLE "service_slots" ADD CONSTRAINT "service_slots_member_id_fkey" 
  FOREIGN KEY ("member_id") REFERENCES "provider_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Drop old unique constraint
DROP INDEX IF EXISTS "service_slots_service_id_day_of_week_start_time_key";

-- Step 7: Add new unique constraint (per-member)
CREATE UNIQUE INDEX "service_slots_service_id_member_id_day_of_week_start_time_key" 
  ON "service_slots"("service_id", "member_id", "day_of_week", "start_time");

-- Step 8: Add member_id index
CREATE INDEX "service_slots_member_id_idx" ON "service_slots"("member_id");
