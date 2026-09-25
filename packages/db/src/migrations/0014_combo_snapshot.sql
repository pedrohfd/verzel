ALTER TABLE "purchase_combo_item" DROP CONSTRAINT "purchase_combo_item_combo_id_combo_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_combo_item" ALTER COLUMN "combo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_combo_item" ADD COLUMN "combo_description" text;--> statement-breakpoint
ALTER TABLE "purchase_combo_item" ADD CONSTRAINT "purchase_combo_item_combo_id_combo_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "purchase_combo_item" SET "combo_description" = "combo"."description" FROM "combo" WHERE "combo"."id" = "purchase_combo_item"."combo_id";
