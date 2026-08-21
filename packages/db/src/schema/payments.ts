import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { reservations } from "./reservations";

export const paymentStatusEnum = pgEnum("payment_status", [
	"pending",
	"approved",
	"declined",
]);

export const payments = pgTable("payment", {
	id: uuid("id").primaryKey().defaultRandom(),
	reservationId: uuid("reservation_id")
		.notNull()
		.unique()
		.references(() => reservations.id, { onDelete: "cascade" }),
	amountCents: integer("amount_cents").notNull(),
	method: text("method").notNull(),
	status: paymentStatusEnum("status").default("pending").notNull(),
	processedAt: timestamp("processed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentRelations = relations(payments, ({ one }) => ({
	reservation: one(reservations, {
		fields: [payments.reservationId],
		references: [reservations.id],
	}),
}));
