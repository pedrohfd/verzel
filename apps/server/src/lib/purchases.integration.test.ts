import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	createCombo,
	createEvent,
	createOrganizer,
	createUser,
	holdSeats,
} from "../test-helpers/fixtures";
import { checkout } from "./purchases";

beforeEach(async () => {
	await resetTestData();
});

async function setup() {
	const organizer = await createOrganizer();
	const event = await createEvent(organizer.id, {
		priceCents: 2000,
		rows: 5,
		columns: 5,
	});
	const customer = await createUser("cliente");
	return { organizer, event, customer };
}

function idsOf(holds: ({ id: string } | undefined)[]) {
	return holds.map((hold) => hold?.id ?? "");
}

async function reservationStatuses(ids: string[]) {
	const rows = await db.query.reservations.findMany({
		where: inArray(schema.reservations.id, ids),
	});
	return rows.map((row) => row.status);
}

async function countRows() {
	const purchases = await db.query.purchases.findMany();
	const tickets = await db.query.tickets.findMany();
	const comboItems = await db.query.purchaseComboItems.findMany();
	return {
		purchases: purchases.length,
		tickets: tickets.length,
		comboItems: comboItems.length,
	};
}

describe("checkout", () => {
	it("turns an approved payment of N seats and combos into a single purchase", async () => {
		const { organizer, event, customer } = await setup();
		const popcorn = await createCombo(organizer.id, 1500);
		const soda = await createCombo(organizer.id, 800);
		const holds = await holdSeats(event.id, customer.id, 3);

		const { purchase, tickets } = await checkout({
			reservationIds: idsOf(holds),
			customerId: customer.id,
			outcome: "approve",
			comboItems: [
				{ comboId: popcorn.id, quantity: 2 },
				{ comboId: soda.id, quantity: 1 },
			],
		});

		expect(purchase).toMatchObject({
			customerId: customer.id,
			eventId: event.id,
			amountCents: 3 * 2000 + 2 * 1500 + 800,
		});
		expect(tickets).toHaveLength(3);
		for (const ticket of tickets) {
			expect(ticket.purchaseId).toBe(purchase?.id);
			expect(ticket.priceCents).toBe(2000);
			expect(ticket.code).toEqual(expect.any(String));
		}
		expect(await countRows()).toEqual({
			purchases: 1,
			tickets: 3,
			comboItems: 2,
		});
		expect(await reservationStatuses(idsOf(holds))).toEqual([
			"paid",
			"paid",
			"paid",
		]);
	});

	it("freezes combo names and prices at the time of purchase", async () => {
		const { organizer, event, customer } = await setup();
		const popcorn = await createCombo(organizer.id, 1500);
		const holds = await holdSeats(event.id, customer.id, 1);

		const { purchase } = await checkout({
			reservationIds: idsOf(holds),
			customerId: customer.id,
			outcome: "approve",
			comboItems: [{ comboId: popcorn.id, quantity: 2 }],
		});
		await db
			.update(schema.combos)
			.set({ name: "Renamed", priceCents: 9999 })
			.where(eq(schema.combos.id, popcorn.id));
		await db
			.update(schema.events)
			.set({ priceCents: 9999 })
			.where(eq(schema.events.id, event.id));

		const items = await db.query.purchaseComboItems.findMany({
			where: eq(schema.purchaseComboItems.purchaseId, purchase?.id ?? ""),
		});
		const tickets = await db.query.tickets.findMany({
			where: eq(schema.tickets.purchaseId, purchase?.id ?? ""),
		});
		expect(items).toMatchObject([
			{ comboName: popcorn.name, unitPriceCents: 1500, quantity: 2 },
		]);
		expect(tickets.map((ticket) => ticket.priceCents)).toEqual([2000]);
	});

	it("creates no purchase on a declined payment and frees the seats", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 2);

		const result = await checkout({
			reservationIds: idsOf(holds),
			customerId: customer.id,
			outcome: "decline",
		});

		expect(result).toEqual({ purchase: null, tickets: [] });
		expect(await countRows()).toEqual({
			purchases: 0,
			tickets: 0,
			comboItems: 0,
		});
		expect(await reservationStatuses(idsOf(holds))).toEqual([
			"cancelled",
			"cancelled",
		]);
		const someoneElse = await createUser("cliente");
		await expect(holdSeats(event.id, someoneElse.id, 2)).resolves.toHaveLength(
			2,
		);
	});

	it("accepts exactly 10 seats", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 10);

		const { tickets } = await checkout({
			reservationIds: idsOf(holds),
			customerId: customer.id,
			outcome: "approve",
		});

		expect(tickets).toHaveLength(10);
	});

	it("rejects more than 10 seats without writing anything", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 11);

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "TICKET_LIMIT_EXCEEDED" });

		expect(await countRows()).toMatchObject({ purchases: 0, tickets: 0 });
		expect(new Set(await reservationStatuses(idsOf(holds)))).toEqual(
			new Set(["holding"]),
		);
	});

	it("rejects an empty checkout", async () => {
		const { customer } = await setup();

		await expect(
			checkout({
				reservationIds: [],
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "TICKET_LIMIT_EXCEEDED" });
	});

	it("rejects seats from different sessions without writing anything", async () => {
		const { organizer, event, customer } = await setup();
		const otherEvent = await createEvent(organizer.id);
		const holds = [
			...(await holdSeats(event.id, customer.id, 1)),
			...(await holdSeats(otherEvent.id, customer.id, 1)),
		];

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "MIXED_SESSIONS" });

		expect(await countRows()).toMatchObject({ purchases: 0, tickets: 0 });
		expect(await reservationStatuses(idsOf(holds))).toEqual([
			"holding",
			"holding",
		]);
	});

	it("fails the whole purchase when one hold has expired", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 2);
		await db
			.update(schema.reservations)
			.set({ holdExpiresAt: new Date(Date.now() - 1000) })
			.where(eq(schema.reservations.id, holds[1]?.id ?? ""));

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "HOLD_EXPIRED" });

		expect(await countRows()).toMatchObject({ purchases: 0, tickets: 0 });
		expect(await reservationStatuses(idsOf(holds))).toEqual([
			"holding",
			"holding",
		]);
	});

	it("refuses to pay for another customer's hold", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 1);
		const stranger = await createUser("cliente");

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: stranger.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		expect(await countRows()).toMatchObject({ purchases: 0 });
	});

	it("refuses a hold that was already paid", async () => {
		const { event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 1);
		await checkout({
			reservationIds: idsOf(holds),
			customerId: customer.id,
			outcome: "approve",
		});

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "RESERVATION_NOT_HOLDING" });

		expect(await countRows()).toMatchObject({ purchases: 1, tickets: 1 });
	});

	it("refuses a combo from another cinema", async () => {
		const { event, customer } = await setup();
		const otherOrganizer = await createOrganizer();
		const foreignCombo = await createCombo(otherOrganizer.id);
		const holds = await holdSeats(event.id, customer.id, 1);

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
				comboItems: [{ comboId: foreignCombo.id, quantity: 1 }],
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		expect(await countRows()).toMatchObject({ purchases: 0 });
	});
});
