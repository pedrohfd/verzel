CREATE TABLE "refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"ticket_id" uuid,
	"amount_cents" integer NOT NULL,
	"reason" "cancellation_reason" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_purchase_id_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE set null ON UPDATE no action;