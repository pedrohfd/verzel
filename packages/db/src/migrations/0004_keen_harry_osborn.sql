CREATE TABLE "cinema_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" text NOT NULL,
	"name" text NOT NULL,
	"rows" integer NOT NULL,
	"columns" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "room_id" uuid;--> statement-breakpoint
ALTER TABLE "cinema_room" ADD CONSTRAINT "cinema_room_organizer_id_user_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_room_id_cinema_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."cinema_room"("id") ON DELETE set null ON UPDATE no action;