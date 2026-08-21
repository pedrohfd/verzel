import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { seats } from "./seats";

export const eventStatusEnum = pgEnum("event_status", [
	"draft",
	"published",
	"cancelled",
]);

export const events = pgTable("event", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizerId: text("organizer_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	tmdbMovieId: integer("tmdb_movie_id").notNull(),
	movieTitle: text("movie_title").notNull(),
	moviePosterPath: text("movie_poster_path"),
	movieBackdropPath: text("movie_backdrop_path"),
	sessionAt: timestamp("session_at").notNull(),
	venueName: text("venue_name").notNull(),
	venueAddress: text("venue_address").notNull(),
	priceCents: integer("price_cents").notNull(),
	rows: integer("rows").notNull(),
	columns: integer("columns").notNull(),
	status: eventStatusEnum("status").default("draft").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const eventRelations = relations(events, ({ one, many }) => ({
	organizer: one(user, {
		fields: [events.organizerId],
		references: [user.id],
	}),
	seats: many(seats),
}));
