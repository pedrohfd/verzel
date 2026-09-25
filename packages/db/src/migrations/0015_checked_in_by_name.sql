ALTER TABLE "ticket" DROP CONSTRAINT "ticket_checked_in_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "checked_in_by_name" text;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_checked_in_by_user_id_user_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "ticket" SET "checked_in_by_name" = "user"."name" FROM "user" WHERE "user"."id" = "ticket"."checked_in_by_user_id";
