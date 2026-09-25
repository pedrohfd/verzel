import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createEvent,
	createOrganizer,
	createUser,
	holdSeats,
} from "../test-helpers/fixtures";
import { cancelHolds, countActiveHolds, createHolds } from "./reservations";

beforeEach(async () => {
	await resetTestData();
});

async function setup() {
	const organizer = await createOrganizer();
	const event = await createEvent(organizer.id, { rows: 5, columns: 5 });
	const customer = await createUser("cliente");
	return { event, customer };
}

async function activeHoldsOf(customerId: string, eventId: string) {
	return db.query.reservations.findMany({
		where: and(
			eq(schema.reservations.customerId, customerId),
			eq(schema.reservations.eventId, eventId),
			eq(schema.reservations.status, "holding"),
			gte(schema.reservations.holdExpiresAt, new Date()),
		),
	});
}

describe("createHolds", () => {
	it("lets a customer hold up to 10 seats of a session", async () => {
		const { event, customer } = await setup();

		await holdSeats(event.id, customer.id, 6);
		await expect(holdSeats(event.id, customer.id, 4, 6)).resolves.toHaveLength(
			4,
		);

		expect(await activeHoldsOf(customer.id, event.id)).toHaveLength(10);
	});

	it("refuses a request that would go past 10 active holds without creating any", async () => {
		const { event, customer } = await setup();
		await holdSeats(event.id, customer.id, 8);

		await expect(holdSeats(event.id, customer.id, 3, 8)).rejects.toMatchObject({
			code: "RESERVATION_LIMIT_EXCEEDED",
		});

		expect(await activeHoldsOf(customer.id, event.id)).toHaveLength(8);
	});

	it("does not count paid, cancelled or expired holds", async () => {
		const { event, customer } = await setup();
		await buyTickets(event.id, customer.id, 10);
		const cancelled = await holdSeats(event.id, customer.id, 5, 10);
		await cancelHolds(
			cancelled.map((hold) => hold?.id ?? ""),
			customer.id,
		);
		await holdSeats(event.id, customer.id, 5, 15);
		await db
			.update(schema.reservations)
			.set({ holdExpiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.reservations.status, "holding"));

		await expect(
			holdSeats(event.id, customer.id, 10, 10),
		).resolves.toHaveLength(10);
	});

	it("counts holds per session and per customer", async () => {
		const { event, customer } = await setup();
		const otherEvent = await createEvent(event.organizerId);
		const otherCustomer = await createUser("cliente");
		await holdSeats(event.id, customer.id, 10);

		await expect(
			holdSeats(otherEvent.id, customer.id, 10),
		).resolves.toHaveLength(10);
		await expect(
			holdSeats(event.id, otherCustomer.id, 10, 10),
		).resolves.toHaveLength(10);
	});

	it("keeps the limit under concurrent requests from the same customer", async () => {
		const { event, customer } = await setup();
		const firstSeats = Array.from({ length: 6 }, (_, column) => ({
			row: 0 + Math.floor(column / 5),
			column: column % 5,
		}));
		const secondSeats = Array.from({ length: 6 }, (_, index) => ({
			row: 2 + Math.floor(index / 5),
			column: index % 5,
		}));

		const results = await Promise.allSettled([
			createHolds(event.id, firstSeats, customer.id),
			createHolds(event.id, secondSeats, customer.id),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect(await activeHoldsOf(customer.id, event.id)).toHaveLength(6);
	});
});

describe("createHolds at the session start", () => {
	it("still holds seats 1 minute before the session starts", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, {
			sessionAt: new Date(Date.now() + 60_000),
		});
		const customer = await createUser("cliente");

		await expect(holdSeats(event.id, customer.id, 2)).resolves.toHaveLength(2);
	});

	it("refuses to hold seats once the session has started, creating none", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { sessionAt: new Date() });
		const customer = await createUser("cliente");

		await expect(holdSeats(event.id, customer.id, 2)).rejects.toMatchObject({
			code: "EVENT_ALREADY_STARTED",
		});
		expect(await activeHoldsOf(customer.id, event.id)).toHaveLength(0);
	});
});

describe("countActiveHolds", () => {
	it("counts only the customer's live holds of the session", async () => {
		const { event, customer } = await setup();
		await buyTickets(event.id, customer.id, 2);
		const cancelled = await holdSeats(event.id, customer.id, 1, 2);
		await cancelHolds(
			cancelled.map((hold) => hold?.id ?? ""),
			customer.id,
		);
		await holdSeats(event.id, customer.id, 3, 3);
		await holdSeats(event.id, (await createUser("cliente")).id, 1, 6);

		expect(await countActiveHolds(event.id, customer.id)).toBe(3);
	});
});
