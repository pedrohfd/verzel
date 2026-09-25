import { randomUUID } from "node:crypto";

import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { vi } from "vitest";

import { checkout } from "../lib/purchases";
import { createHolds } from "../lib/reservations";

type Role = "cliente" | "organizador" | "portaria";

export async function createUser(
	role: Role = "cliente",
	overrides: Partial<typeof schema.user.$inferInsert> = {},
) {
	const id = randomUUID();
	const [user] = await db
		.insert(schema.user)
		.values({
			id,
			name: `User ${id.slice(0, 8)}`,
			email: `${id}@test.dev`,
			role,
			...overrides,
		})
		.returning();
	if (!user) throw new Error("Failed to create user");
	return user;
}

export function createOrganizer() {
	return createUser("organizador", { cinemaName: "Cine Teste" });
}

export function createGatekeeper(organizerId: string) {
	return createUser("portaria", { createdBy: organizerId });
}

export async function createEvent(
	organizerId: string,
	overrides: Partial<typeof schema.events.$inferInsert> = {},
) {
	const [event] = await db
		.insert(schema.events)
		.values({
			organizerId,
			tmdbMovieId: 1,
			movieTitle: "Filme Teste",
			sessionAt: new Date(Date.now() + 30 * 60_000),
			durationMinutes: 120,
			venueName: "Cine Teste",
			venueAddress: "Rua A, 10",
			priceCents: 2000,
			rows: 5,
			columns: 5,
			status: "published",
			...overrides,
		})
		.returning();
	if (!event) throw new Error("Failed to create event");
	return event;
}

// Sales close when the session starts, so tickets of past sessions are bought
// while the session is upcoming and the session is then moved back in time.
export async function moveSessionTo(eventId: string, sessionAt: Date) {
	await db
		.update(schema.events)
		.set({ sessionAt })
		.where(eq(schema.events.id, eventId));
}

// Freezes the clock (Date only) so rules that compare "now" with the session
// start can be tested exactly on their boundaries.
export async function freezeClockMinutesBeforeSession(
	eventId: string,
	minutes: number,
) {
	const now = new Date();
	vi.useFakeTimers({ toFake: ["Date"], now });
	const sessionAt = new Date(now.getTime() + minutes * 60_000);
	await moveSessionTo(eventId, sessionAt);
	return sessionAt;
}

export async function createRoom(organizerId: string, rows = 5, columns = 5) {
	const [room] = await db
		.insert(schema.cinemaRooms)
		.values({ organizerId, name: `Sala ${randomUUID()}`, rows, columns })
		.returning();
	if (!room) throw new Error("Failed to create room");
	return room;
}

export async function createCombo(organizerId: string, priceCents = 1500) {
	const [combo] = await db
		.insert(schema.combos)
		.values({ organizerId, name: `Combo ${randomUUID()}`, priceCents })
		.returning();
	if (!combo) throw new Error("Failed to create combo");
	return combo;
}

export async function holdSeats(
	eventId: string,
	customerId: string,
	count: number,
	firstColumn = 0,
) {
	const seats = Array.from({ length: count }, (_, index) => ({
		row: Math.floor((firstColumn + index) / 5),
		column: (firstColumn + index) % 5,
	}));
	return createHolds(eventId, seats, customerId);
}

export async function buyTickets(
	eventId: string,
	customerId: string,
	count = 1,
	comboItems: { comboId: string; quantity: number }[] = [],
	firstColumn = 0,
) {
	const holds = await holdSeats(eventId, customerId, count, firstColumn);
	return checkout({
		reservationIds: holds.map((hold) => hold?.id ?? ""),
		customerId,
		outcome: "approve",
		comboItems,
	});
}
