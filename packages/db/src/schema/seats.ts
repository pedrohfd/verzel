import { relations } from "drizzle-orm";
import { integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { events } from "./events";
import { reservations } from "./reservations";

export const seats = pgTable(
	"seat",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		row: integer("row").notNull(),
		column: integer("column").notNull(),
		label: text("label").notNull(),
	},
	(table) => [
		unique("seat_event_row_column_unique").on(
			table.eventId,
			table.row,
			table.column,
		),
	],
);

export const seatRelations = relations(seats, ({ one, many }) => ({
	event: one(events, {
		fields: [seats.eventId],
		references: [events.id],
	}),
	reservations: many(reservations),
}));
