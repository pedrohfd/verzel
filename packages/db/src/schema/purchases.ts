import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { cancellationReasonEnum } from "./cancellation-reason";
import { combos } from "./combos";
import { events } from "./events";
import { tickets } from "./tickets";

export const purchases = pgTable("purchase", {
	id: uuid("id").primaryKey().defaultRandom(),
	customerId: text("customer_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	eventId: uuid("event_id")
		.notNull()
		.references(() => events.id, { onDelete: "cascade" }),
	amountCents: integer("amount_cents").notNull(),
	method: text("method").notNull(),
	processedAt: timestamp("processed_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refunds = pgTable("refund", {
	id: uuid("id").primaryKey().defaultRandom(),
	purchaseId: uuid("purchase_id")
		.notNull()
		.references(() => purchases.id, { onDelete: "cascade" }),
	// The ticket whose cancellation generated the refund. Null when a whole
	// session is cancelled, which refunds the rest of the purchase at once.
	ticketId: uuid("ticket_id").references(() => tickets.id, {
		onDelete: "set null",
	}),
	amountCents: integer("amount_cents").notNull(),
	reason: cancellationReasonEnum("reason").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseComboItems = pgTable("purchase_combo_item", {
	id: uuid("id").primaryKey().defaultRandom(),
	purchaseId: uuid("purchase_id")
		.notNull()
		.references(() => purchases.id, { onDelete: "cascade" }),
	comboId: uuid("combo_id")
		.notNull()
		.references(() => combos.id, { onDelete: "restrict" }),
	comboName: text("combo_name").notNull(),
	unitPriceCents: integer("unit_price_cents").notNull(),
	quantity: integer("quantity").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseRelations = relations(purchases, ({ one, many }) => ({
	customer: one(user, {
		fields: [purchases.customerId],
		references: [user.id],
	}),
	event: one(events, {
		fields: [purchases.eventId],
		references: [events.id],
	}),
	tickets: many(tickets),
	comboItems: many(purchaseComboItems),
	refunds: many(refunds),
}));

export const refundRelations = relations(refunds, ({ one }) => ({
	purchase: one(purchases, {
		fields: [refunds.purchaseId],
		references: [purchases.id],
	}),
	ticket: one(tickets, {
		fields: [refunds.ticketId],
		references: [tickets.id],
	}),
}));

export const purchaseComboItemRelations = relations(
	purchaseComboItems,
	({ one }) => ({
		purchase: one(purchases, {
			fields: [purchaseComboItems.purchaseId],
			references: [purchases.id],
		}),
		combo: one(combos, {
			fields: [purchaseComboItems.comboId],
			references: [combos.id],
		}),
	}),
);
