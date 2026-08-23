import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, desc, eq, gte, or } from "drizzle-orm";

import { ForbiddenError, NotFoundError } from "./errors";
import { seatLabel } from "./seat-label";

export interface CreateEventInput {
	organizerId: string;
	tmdbMovieId: number;
	movieTitle: string;
	moviePosterPath: string | null;
	movieBackdropPath: string | null;
	sessionAt: Date;
	venueName: string;
	venueAddress: string;
	priceCents: number;
	roomId: string;
	rows: number;
	columns: number;
}

export function createEvent(input: CreateEventInput) {
	return db.insert(schema.events).values(input).returning();
}

export async function getOwnedEvent(eventId: string, organizerId: string) {
	const event = await db.query.events.findFirst({
		where: eq(schema.events.id, eventId),
	});
	if (!event) throw new NotFoundError("Event");
	if (event.organizerId !== organizerId) throw new ForbiddenError();
	return event;
}

export async function publishEvent(eventId: string, organizerId: string) {
	return db.transaction(async (tx) => {
		const [event] = await tx
			.select()
			.from(schema.events)
			.where(eq(schema.events.id, eventId))
			.for("update");

		if (!event) throw new NotFoundError("Event");
		if (event.organizerId !== organizerId) throw new ForbiddenError();

		const [updated] = await tx
			.update(schema.events)
			.set({ status: "published" })
			.where(eq(schema.events.id, eventId))
			.returning();

		return updated;
	});
}

export interface UpdateEventInput {
	tmdbMovieId: number;
	movieTitle: string;
	moviePosterPath: string | null;
	movieBackdropPath: string | null;
	sessionAt: Date;
	priceCents: number;
	roomId: string;
	rows: number;
	columns: number;
}

export async function updateEvent(eventId: string, patch: UpdateEventInput) {
	const [updated] = await db
		.update(schema.events)
		.set(patch)
		.where(eq(schema.events.id, eventId))
		.returning();
	return updated;
}

export async function cancelEvent(eventId: string, organizerId: string) {
	await getOwnedEvent(eventId, organizerId);
	const [updated] = await db
		.update(schema.events)
		.set({ status: "cancelled" })
		.where(eq(schema.events.id, eventId))
		.returning();
	return updated;
}

export interface ListPublishedEventsFilters {
	search?: string;
	tmdbMovieId?: number;
}

export function listPublishedEvents(filters: ListPublishedEventsFilters = {}) {
	const { search, tmdbMovieId } = filters;

	return db.query.events
		.findMany({
			where: and(
				eq(schema.events.status, "published"),
				gte(schema.events.sessionAt, new Date()),
				tmdbMovieId !== undefined
					? eq(schema.events.tmdbMovieId, tmdbMovieId)
					: undefined,
			),
			orderBy: asc(schema.events.sessionAt),
			with: { room: true },
		})
		.then((events) =>
			search
				? events.filter((event) =>
						event.movieTitle.toLowerCase().includes(search.toLowerCase()),
					)
				: events,
		)
		.then((events) =>
			events.map(({ room, ...event }) => ({
				...event,
				roomName: room?.name ?? null,
			})),
		);
}

export function listOrganizerEvents(organizerId: string) {
	return db.query.events.findMany({
		where: eq(schema.events.organizerId, organizerId),
		orderBy: desc(schema.events.createdAt),
	});
}

export async function getPublicEvent(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(schema.events.id, eventId),
	});
	if (!event) throw new NotFoundError("Event");
	return event;
}

export async function getSeatMap(eventId: string) {
	const event = await getPublicEvent(eventId);

	if (event.status === "draft") return [];

	const liveReservations = await db.query.reservations.findMany({
		where: and(
			eq(schema.reservations.eventId, eventId),
			or(
				eq(schema.reservations.status, "paid"),
				and(
					eq(schema.reservations.status, "holding"),
					gte(schema.reservations.holdExpiresAt, new Date()),
				),
			),
		),
		with: { seat: true },
	});

	const takenByRowColumn = new Set(
		liveReservations.map((r) => `${r.seat.row}:${r.seat.column}`),
	);

	const grid = [];
	for (let row = 0; row < event.rows; row++) {
		for (let column = 0; column < event.columns; column++) {
			grid.push({
				eventId,
				row,
				column,
				label: seatLabel(row, column),
				status: takenByRowColumn.has(`${row}:${column}`)
					? ("taken" as const)
					: ("available" as const),
			});
		}
	}
	return grid;
}
