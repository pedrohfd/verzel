ALTER TABLE "event" ADD COLUMN "duration_minutes" integer NOT NULL DEFAULT 120;
ALTER TABLE "event" ALTER COLUMN "duration_minutes" DROP DEFAULT;