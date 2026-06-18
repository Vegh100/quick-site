-- Add optional break window (e.g. lunch break) to provider availability rows.
-- A NULL break means no break is configured for that day.

ALTER TABLE "availability"
  ADD COLUMN "break_start" VARCHAR(5),
  ADD COLUMN "break_end"   VARCHAR(5);
