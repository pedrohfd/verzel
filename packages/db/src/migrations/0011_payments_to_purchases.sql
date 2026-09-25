-- Each approved per-seat payment becomes a Purchase holding that seat's ticket
-- (and the combos that were attached to that payment). The purchase reuses the
-- payment id so ticket and combo rows can be linked back without a lookup table.
INSERT INTO "purchase" ("id", "customer_id", "event_id", "amount_cents", "method", "processed_at", "created_at")
SELECT p."id", r."customer_id", r."event_id", p."amount_cents", p."method", COALESCE(p."processed_at", p."created_at"), p."created_at"
FROM "payment" p
JOIN "reservation" r ON r."id" = p."reservation_id"
WHERE p."status" = 'approved';
--> statement-breakpoint
INSERT INTO "purchase_combo_item" ("id", "purchase_id", "combo_id", "combo_name", "unit_price_cents", "quantity", "created_at")
SELECT ci."id", ci."payment_id", ci."combo_id", ci."combo_name", ci."unit_price_cents", ci."quantity", ci."created_at"
FROM "payment_combo_item" ci
JOIN "payment" p ON p."id" = ci."payment_id"
WHERE p."status" = 'approved';
--> statement-breakpoint
UPDATE "ticket" t
SET "purchase_id" = p."id",
	"price_cents" = p."amount_cents" - COALESCE(
		(SELECT SUM(ci."unit_price_cents" * ci."quantity") FROM "payment_combo_item" ci WHERE ci."payment_id" = p."id"),
		0
	)
FROM "payment" p
WHERE p."reservation_id" = t."reservation_id" AND p."status" = 'approved';
--> statement-breakpoint
UPDATE "ticket" SET "cancellation_reason" = 'customer_cancelled' WHERE "cancelled_at" IS NOT NULL;
