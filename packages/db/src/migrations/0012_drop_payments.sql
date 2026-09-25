ALTER TABLE "payment_combo_item" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "payment_combo_item" CASCADE;--> statement-breakpoint
DROP TABLE "payment" CASCADE;--> statement-breakpoint
ALTER TABLE "ticket" ALTER COLUMN "purchase_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket" ALTER COLUMN "price_cents" SET NOT NULL;--> statement-breakpoint
DROP TYPE "public"."payment_status";