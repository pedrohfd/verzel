import { relations } from "drizzle-orm";
import {
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const cinemaRooms = pgTable(
	"cinema_room",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizerId: text("organizer_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		rows: integer("rows").notNull(),
		columns: integer("columns").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		unique("cinema_room_organizer_name_unique").on(
			table.organizerId,
			table.name,
		),
	],
);

export const cinemaRoomRelations = relations(cinemaRooms, ({ one }) => ({
	organizer: one(user, {
		fields: [cinemaRooms.organizerId],
		references: [user.id],
	}),
}));
