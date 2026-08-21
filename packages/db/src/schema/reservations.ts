import { relations, sql } from "drizzle-orm";
import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { events } from "./events";
import { seats } from "./seats";
import { tickets } from "./tickets";

export const reservationStatusEnum = pgEnum("reservation_status", [
	"holding",
	"paid",
	"expired",
	"cancelled",
]);

export const reservations = pgTable(
	"reservation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		seatId: uuid("seat_id")
			.notNull()
			.references(() => seats.id, { onDelete: "cascade" }),
		customerId: text("customer_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: reservationStatusEnum("status").default("holding").notNull(),
		holdExpiresAt: timestamp("hold_expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		// Guarantees a seat can never have more than one live (holding/paid)
		// reservation at a time — this is what actually prevents double-selling
		// a seat under concurrent requests, not app-level checks.
		uniqueIndex("reservation_live_seat_unique")
			.on(table.seatId)
			.where(sql`${table.status} IN ('holding', 'paid')`),
	],
);

export const reservationRelations = relations(reservations, ({ one }) => ({
	event: one(events, {
		fields: [reservations.eventId],
		references: [events.id],
	}),
	seat: one(seats, {
		fields: [reservations.seatId],
		references: [seats.id],
	}),
	customer: one(user, {
		fields: [reservations.customerId],
		references: [user.id],
	}),
	ticket: one(tickets, {
		fields: [reservations.id],
		references: [tickets.reservationId],
	}),
}));
