import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { combos } from "./combos";
import { payments } from "./payments";

export const paymentComboItems = pgTable("payment_combo_item", {
	id: uuid("id").primaryKey().defaultRandom(),
	paymentId: uuid("payment_id")
		.notNull()
		.references(() => payments.id, { onDelete: "cascade" }),
	comboId: uuid("combo_id")
		.notNull()
		.references(() => combos.id, { onDelete: "restrict" }),
	comboName: text("combo_name").notNull(),
	unitPriceCents: integer("unit_price_cents").notNull(),
	quantity: integer("quantity").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentComboItemRelations = relations(
	paymentComboItems,
	({ one }) => ({
		payment: one(payments, {
			fields: [paymentComboItems.paymentId],
			references: [payments.id],
		}),
		combo: one(combos, {
			fields: [paymentComboItems.comboId],
			references: [combos.id],
		}),
	}),
);
