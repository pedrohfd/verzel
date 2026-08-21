import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, eq, gte, or } from "drizzle-orm";

import { ForbiddenError, NotFoundError } from "./errors";

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

function seatLabel(row: number, column: number): string {
	const letter = String.fromCharCode(65 + row);
	return `${letter}${column + 1}`;
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

		if (event.status === "draft") {
			const seatRows = [];
			for (let row = 0; row < event.rows; row++) {
				for (let column = 0; column < event.columns; column++) {
					seatRows.push({
						eventId,
						row,
						column,
						label: seatLabel(row, column),
					});
				}
			}
			await tx.insert(schema.seats).values(seatRows);
		}

		const [updated] = await tx
			.update(schema.events)
			.set({ status: "published" })
			.where(eq(schema.events.id, eventId))
			.returning();

		return updated;
	});
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

export function listPublishedEvents(search?: string) {
	return db.query.events
		.findMany({
			where: and(
				eq(schema.events.status, "published"),
				gte(schema.events.sessionAt, new Date()),
			),
			orderBy: asc(schema.events.sessionAt),
		})
		.then((events) =>
			search
				? events.filter((event) =>
						event.movieTitle.toLowerCase().includes(search.toLowerCase()),
					)
				: events,
		);
}

export function listOrganizerEvents(organizerId: string) {
	return db.query.events.findMany({
		where: eq(schema.events.organizerId, organizerId),
		orderBy: asc(schema.events.sessionAt),
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
	await getPublicEvent(eventId);

	const seats = await db.query.seats.findMany({
		where: eq(schema.seats.eventId, eventId),
	});

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
	});

	const reservedSeatIds = new Set(liveReservations.map((r) => r.seatId));

	return seats.map((seat) => ({
		...seat,
		status: reservedSeatIds.has(seat.id)
			? ("taken" as const)
			: ("available" as const),
	}));
}
