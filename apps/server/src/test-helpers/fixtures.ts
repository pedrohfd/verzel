import { randomUUID } from "node:crypto";

import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";

import { processPayment } from "../lib/payments";
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
			sessionAt: new Date(Date.now() + 60 * 60_000),
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
	return processPayment(
		holds.map((hold) => hold?.id ?? ""),
		customerId,
		"approve",
		comboItems,
	);
}
