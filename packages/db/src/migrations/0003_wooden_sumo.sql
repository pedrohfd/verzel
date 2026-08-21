UPDATE "user" SET "cnpj" = regexp_replace("cnpj", '\D', '', 'g') WHERE "cnpj" IS NOT NULL;--> statement-breakpoint
UPDATE "user" SET "zip_code" = regexp_replace("zip_code", '\D', '', 'g') WHERE "zip_code" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "cinema_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "cnpj" SET DATA TYPE char(14);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "zip_code" SET DATA TYPE char(8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "street" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "number" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "complement" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "neighborhood" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "city" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "state" SET DATA TYPE char(2);