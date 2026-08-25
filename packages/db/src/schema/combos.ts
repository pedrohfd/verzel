import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const combos = pgTable(
	"combo",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizerId: text("organizer_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		priceCents: integer("price_cents").notNull(),
		active: boolean("active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		unique("combo_organizer_name_unique").on(table.organizerId, table.name),
	],
);

export const comboRelations = relations(combos, ({ one }) => ({
	organizer: one(user, {
		fields: [combos.organizerId],
		references: [user.id],
	}),
}));
