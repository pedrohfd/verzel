import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { cancellationReasonEnum } from "./cancellation-reason";
import { events } from "./events";
import { purchases } from "./purchases";
import { reservations } from "./reservations";
import { seats } from "./seats";

export const tickets = pgTable("ticket", {
	id: uuid("id").primaryKey().defaultRandom(),
	reservationId: uuid("reservation_id")
		.notNull()
		.unique()
		.references(() => reservations.id, { onDelete: "cascade" }),
	eventId: uuid("event_id")
		.notNull()
		.references(() => events.id, { onDelete: "cascade" }),
	seatId: uuid("seat_id")
		.notNull()
		.references(() => seats.id, { onDelete: "cascade" }),
	purchaseId: uuid("purchase_id")
		.notNull()
		.references(() => purchases.id, { onDelete: "cascade" }),
	priceCents: integer("price_cents").notNull(),
	shareToken: text("share_token").notNull().unique(),
	signature: text("signature").notNull(),
	issuedAt: timestamp("issued_at").notNull(),
	checkedInAt: timestamp("checked_in_at"),
	checkedInByUserId: text("checked_in_by_user_id").references(() => user.id),
	cancelledAt: timestamp("cancelled_at"),
	cancellationReason: cancellationReasonEnum("cancellation_reason"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketRelations = relations(tickets, ({ one }) => ({
	reservation: one(reservations, {
		fields: [tickets.reservationId],
		references: [reservations.id],
	}),
	event: one(events, {
		fields: [tickets.eventId],
		references: [events.id],
	}),
	seat: one(seats, {
		fields: [tickets.seatId],
		references: [seats.id],
	}),
	purchase: one(purchases, {
		fields: [tickets.purchaseId],
		references: [purchases.id],
	}),
	checkedInBy: one(user, {
		fields: [tickets.checkedInByUserId],
		references: [user.id],
	}),
}));
