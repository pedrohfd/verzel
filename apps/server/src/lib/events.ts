import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import {
	and,
	asc,
	desc,
	eq,
	gte,
	inArray,
	lt,
	lte,
	ne,
	or,
	sql,
} from "drizzle-orm";

import {
	ForbiddenError,
	NotFoundError,
	RoomScheduleConflictError,
} from "./errors";
import { matchesMovieSearch } from "./search-movie-title";
import { seatLabel } from "./seat-label";

const ROOM_CLEANUP_BUFFER_MINUTES = 10;

export interface CreateEventInput {
	organizerId: string;
	tmdbMovieId: number;
	movieTitle: string;
	moviePosterPath: string | null;
	movieBackdropPath: string | null;
	sessionAt: Date;
	durationMinutes: number;
	venueName: string;
	venueAddress: string;
	priceCents: number;
	roomId: string;
	rows: number;
	columns: number;
}

async function assertNoRoomConflict(
	roomId: string,
	sessionAt: Date,
	durationMinutes: number,
	excludeEventId?: string,
) {
	const endsAt = new Date(
		sessionAt.getTime() +
			(durationMinutes + ROOM_CLEANUP_BUFFER_MINUTES) * 60_000,
	);

	const conflict = await db.query.events.findFirst({
		where: and(
			eq(schema.events.roomId, roomId),
			inArray(schema.events.status, ["draft", "published"]),
			excludeEventId ? ne(schema.events.id, excludeEventId) : undefined,
			lt(schema.events.sessionAt, endsAt),
			sql`${schema.events.sessionAt} + ((${schema.events.durationMinutes} + ${ROOM_CLEANUP_BUFFER_MINUTES}) * interval '1 minute') > ${sessionAt}`,
		),
	});
	if (conflict) throw new RoomScheduleConflictError();
}

export async function createEvent(input: CreateEventInput) {
	await assertNoRoomConflict(
		input.roomId,
		input.sessionAt,
		input.durationMinutes,
	);
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
	durationMinutes: number;
	priceCents: number;
	roomId: string;
	rows: number;
	columns: number;
}

export async function updateEvent(eventId: string, patch: UpdateEventInput) {
	await assertNoRoomConflict(
		patch.roomId,
		patch.sessionAt,
		patch.durationMinutes,
		eventId,
	);
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

function dayRange(date: string): { start: Date; end: Date } {
	const start = new Date(`${date}T00:00:00`);
	const end = new Date(start.getTime() + 24 * 60 * 60_000);
	return { start, end };
}

export interface ListPublishedEventsFilters {
	search?: string;
	tmdbMovieId?: number;
	organizerId?: string;
	date?: string;
	venue?: string;
	priceMinCents?: number;
	priceMaxCents?: number;
}

export function listPublishedEvents(filters: ListPublishedEventsFilters = {}) {
	const {
		search,
		tmdbMovieId,
		organizerId,
		date,
		venue,
		priceMinCents,
		priceMaxCents,
	} = filters;
	const range = date ? dayRange(date) : undefined;

	return db.query.events
		.findMany({
			where: and(
				eq(schema.events.status, "published"),
				gte(schema.events.sessionAt, range ? range.start : new Date()),
				range ? lt(schema.events.sessionAt, range.end) : undefined,
				tmdbMovieId !== undefined
					? eq(schema.events.tmdbMovieId, tmdbMovieId)
					: undefined,
				organizerId !== undefined
					? eq(schema.events.organizerId, organizerId)
					: undefined,
				venue !== undefined ? eq(schema.events.venueName, venue) : undefined,
				priceMinCents !== undefined
					? gte(schema.events.priceCents, priceMinCents)
					: undefined,
				priceMaxCents !== undefined
					? lte(schema.events.priceCents, priceMaxCents)
					: undefined,
			),
			orderBy: asc(schema.events.sessionAt),
			with: { room: true },
		})
		.then((events) =>
			search
				? events.filter((event) => matchesMovieSearch(event.movieTitle, search))
				: events,
		)
		.then((events) =>
			events.map(({ room, ...event }) => ({
				...event,
				roomName: room?.name ?? null,
			})),
		);
}

export async function listPublishedVenues() {
	const rows = await db
		.selectDistinct({ venueName: schema.events.venueName })
		.from(schema.events)
		.where(eq(schema.events.status, "published"));
	return rows.map((row) => row.venueName);
}

export interface ListOrganizerEventsFilters {
	status?: (typeof schema.eventStatusEnum.enumValues)[number];
	search?: string;
}

export function listOrganizerEvents(
	organizerId: string,
	filters: ListOrganizerEventsFilters = {},
) {
	const { status, search } = filters;

	return db.query.events
		.findMany({
			where: and(
				eq(schema.events.organizerId, organizerId),
				status !== undefined ? eq(schema.events.status, status) : undefined,
			),
			orderBy: desc(schema.events.createdAt),
		})
		.then((events) =>
			search
				? events.filter((event) => matchesMovieSearch(event.movieTitle, search))
				: events,
		);
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
