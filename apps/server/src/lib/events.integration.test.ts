import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createEvent,
	createOrganizer,
	createRoom,
	createUser,
	holdSeats,
} from "../test-helpers/fixtures";
import { isEventLocked, publishEvent, updateEvent } from "./events";
import { cancelTicket } from "./purchases";
import { cancelHolds } from "./reservations";

beforeEach(async () => {
	await resetTestData();
});

async function statusOf(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(schema.events.id, eventId),
	});
	return event?.status;
}

describe("publishEvent", () => {
	it("publishes a draft session", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "draft" });

		const published = await publishEvent(event.id, organizer.id);

		expect(published?.status).toBe("published");
	});

	it("refuses to publish a cancelled session", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "cancelled" });

		await expect(publishEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "INVALID_EVENT_TRANSITION",
		});
		expect(await statusOf(event.id)).toBe("cancelled");
	});

	it("refuses to publish a session that is already published", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "published" });

		await expect(publishEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "INVALID_EVENT_TRANSITION",
		});
	});
});

type Event = typeof schema.events.$inferSelect;

async function setupScheduledSession() {
	const organizer = await createOrganizer();
	const room = await createRoom(organizer.id, 5, 5);
	const event = await createEvent(organizer.id, {
		roomId: room.id,
		sessionAt: new Date(Date.now() + 2 * 24 * 60 * 60_000),
	});
	const customer = await createUser("cliente");
	return { organizer, room, event, customer };
}

function patchOf(event: Event, overrides: Partial<Event> = {}) {
	const merged = { ...event, ...overrides };
	return {
		tmdbMovieId: merged.tmdbMovieId,
		movieTitle: merged.movieTitle,
		moviePosterPath: merged.moviePosterPath,
		movieBackdropPath: merged.movieBackdropPath,
		sessionAt: merged.sessionAt,
		durationMinutes: merged.durationMinutes,
		priceCents: merged.priceCents,
		roomId: merged.roomId ?? "",
		rows: merged.rows,
		columns: merged.columns,
	};
}

describe("updateEvent", () => {
	it("edits every field of a session without reserved or occupied seats", async () => {
		const { organizer, event } = await setupScheduledSession();
		const otherRoom = await createRoom(organizer.id, 8, 10);
		const sessionAt = new Date(event.sessionAt.getTime() + 60 * 60_000);

		const updated = await updateEvent(
			event.id,
			patchOf(event, {
				tmdbMovieId: 99,
				movieTitle: "Outro Filme",
				sessionAt,
				durationMinutes: 90,
				roomId: otherRoom.id,
				rows: 8,
				columns: 10,
				priceCents: 3000,
			}),
		);

		expect(updated).toMatchObject({
			tmdbMovieId: 99,
			sessionAt,
			durationMinutes: 90,
			roomId: otherRoom.id,
			rows: 8,
			columns: 10,
			priceCents: 3000,
		});
	});

	it("refuses to change the time while a seat is reserved", async () => {
		const { event, customer } = await setupScheduledSession();
		await holdSeats(event.id, customer.id, 1);

		await expect(
			updateEvent(
				event.id,
				patchOf(event, {
					sessionAt: new Date(event.sessionAt.getTime() + 60 * 60_000),
				}),
			),
		).rejects.toMatchObject({ code: "EVENT_LOCKED" });
	});

	it.each([
		["movie", { tmdbMovieId: 99, movieTitle: "Outro Filme" }],
		["duration", { durationMinutes: 90 }],
		["grid", { rows: 6 }],
	] as const)(
		"refuses to change the %s while a seat is occupied",
		async (_field, overrides) => {
			const { event, customer } = await setupScheduledSession();
			await buyTickets(event.id, customer.id, 1);

			await expect(
				updateEvent(event.id, patchOf(event, overrides)),
			).rejects.toMatchObject({ code: "EVENT_LOCKED" });

			const stored = await db.query.events.findFirst({
				where: eq(schema.events.id, event.id),
			});
			expect(stored).toMatchObject(patchOf(event));
		},
	);

	it("refuses to change the room while a seat is occupied", async () => {
		const { organizer, event, customer } = await setupScheduledSession();
		const otherRoom = await createRoom(organizer.id, 5, 5);
		await buyTickets(event.id, customer.id, 1);

		await expect(
			updateEvent(event.id, patchOf(event, { roomId: otherRoom.id })),
		).rejects.toMatchObject({ code: "EVENT_LOCKED" });
	});

	it("always lets the price change, keeping the price paid by existing tickets", async () => {
		const { event, customer } = await setupScheduledSession();
		const { tickets } = await buyTickets(event.id, customer.id, 1);

		const updated = await updateEvent(
			event.id,
			patchOf(event, { priceCents: 5000 }),
		);

		expect(updated?.priceCents).toBe(5000);
		const stored = await db.query.tickets.findFirst({
			where: eq(schema.tickets.id, tickets[0]?.id ?? ""),
		});
		expect(stored?.priceCents).toBe(2000);
	});

	it("becomes editable again once holds are gone and tickets are cancelled", async () => {
		const { event, customer } = await setupScheduledSession();
		const { tickets } = await buyTickets(event.id, customer.id, 1);
		const holds = await holdSeats(event.id, customer.id, 1, 5);
		await cancelTicket(tickets[0]?.id ?? "", customer.id);
		await cancelHolds(
			holds.map((hold) => hold?.id ?? ""),
			customer.id,
		);
		const expired = await holdSeats(event.id, customer.id, 1, 6);
		await db
			.update(schema.reservations)
			.set({ holdExpiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.reservations.id, expired[0]?.id ?? ""));

		const updated = await updateEvent(
			event.id,
			patchOf(event, { durationMinutes: 90 }),
		);

		expect(updated?.durationMinutes).toBe(90);
	});

	it("refuses a time that overlaps another session of the room", async () => {
		const { organizer, room, event } = await setupScheduledSession();
		const other = await createEvent(organizer.id, {
			roomId: room.id,
			sessionAt: new Date(event.sessionAt.getTime() + 5 * 60 * 60_000),
		});

		await expect(
			updateEvent(event.id, patchOf(event, { sessionAt: other.sessionAt })),
		).rejects.toMatchObject({ code: "ROOM_SCHEDULE_CONFLICT" });
	});
});

describe("isEventLocked", () => {
	it("tells whether the session has reserved or occupied seats", async () => {
		const { event, customer } = await setupScheduledSession();
		expect(await isEventLocked(event.id)).toBe(false);

		await holdSeats(event.id, customer.id, 1);

		expect(await isEventLocked(event.id)).toBe(true);
	});
});
