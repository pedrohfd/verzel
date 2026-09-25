import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createCombo,
	createEvent,
	createGatekeeper,
	createOrganizer,
	createUser,
	holdSeats,
} from "../test-helpers/fixtures";
import { validateTicket } from "./checkin";
import {
	cancelEvent,
	cancelTicket,
	checkout,
	listMyPurchases,
} from "./purchases";
import { getTicketByShareToken } from "./tickets";

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

	it("refuses to pay for holds of a session cancelled in the meantime", async () => {
		const { organizer, event, customer } = await setup();
		const holds = await holdSeats(event.id, customer.id, 1);
		await cancelEvent(event.id, organizer.id);

		await expect(
			checkout({
				reservationIds: idsOf(holds),
				customerId: customer.id,
				outcome: "approve",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		expect(await countRows()).toMatchObject({ purchases: 0, tickets: 0 });
	});

	it("counts a repeated reservation id only once", async () => {
		const { event, customer } = await setup();
		const [hold] = await holdSeats(event.id, customer.id, 1);

		const { purchase, tickets } = await checkout({
			reservationIds: [hold?.id ?? "", hold?.id ?? ""],
			customerId: customer.id,
			outcome: "approve",
		});

		expect(tickets).toHaveLength(1);
		expect(purchase?.amountCents).toBe(2000);
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

async function purchaseWithCombos(ticketCount: number, withCombos = true) {
	const { organizer, event, customer } = await setup();
	const combo = await createCombo(organizer.id, 1500);
	const { purchase, tickets } = await buyTickets(
		event.id,
		customer.id,
		ticketCount,
		withCombos ? [{ comboId: combo.id, quantity: 2 }] : [],
	);
	if (!purchase) throw new Error("Purchase was not approved");
	return { organizer, event, customer, purchase, tickets };
}

async function refundsOf(purchaseId: string) {
	return db.query.refunds.findMany({
		where: eq(schema.refunds.purchaseId, purchaseId),
	});
}

function ticketAt<T>(tickets: T[], index: number): T {
	const ticket = tickets[index];
	if (!ticket) throw new Error(`No ticket at ${index}`);
	return ticket;
}

describe("cancelTicket", () => {
	it("refunds only the ticket price when other tickets of the purchase remain", async () => {
		const { customer, purchase, tickets } = await purchaseWithCombos(3);
		const ticket = ticketAt(tickets, 0);

		const refund = await cancelTicket(ticket.id, customer.id);

		expect(refund).toMatchObject({
			purchaseId: purchase.id,
			ticketId: ticket.id,
			amountCents: 2000,
			reason: "customer_cancelled",
		});
		const stored = await db.query.tickets.findFirst({
			where: eq(schema.tickets.id, ticket.id),
		});
		expect(stored?.cancelledAt).not.toBeNull();
		expect(stored?.cancellationReason).toBe("customer_cancelled");
		const storedPurchase = await db.query.purchases.findFirst({
			where: eq(schema.purchases.id, purchase.id),
		});
		expect(storedPurchase?.amountCents).toBe(purchase.amountCents);
	});

	it("adds the combos to the refund of the last active ticket", async () => {
		const { customer, purchase, tickets } = await purchaseWithCombos(2);

		await cancelTicket(ticketAt(tickets, 0).id, customer.id);
		const last = await cancelTicket(ticketAt(tickets, 1).id, customer.id);

		expect(last.amountCents).toBe(2000 + 2 * 1500);
		const refunds = await refundsOf(purchase.id);
		expect(refunds.reduce((sum, r) => sum + r.amountCents, 0)).toBe(
			purchase.amountCents,
		);
	});

	it("refunds just the ticket price for the last ticket of a purchase without combos", async () => {
		const { customer, tickets } = await purchaseWithCombos(1, false);

		const refund = await cancelTicket(ticketAt(tickets, 0).id, customer.id);

		expect(refund.amountCents).toBe(2000);
	});

	it("keeps the combos when the only other ticket was already used", async () => {
		const { organizer, event, customer, purchase, tickets } =
			await purchaseWithCombos(2);
		const gatekeeper = await createGatekeeper(organizer.id);
		await validateTicket(event.id, ticketAt(tickets, 0).code, {
			id: gatekeeper.id,
			role: "portaria",
		});

		const refund = await cancelTicket(ticketAt(tickets, 1).id, customer.id);

		expect(refund.amountCents).toBe(2000);
		expect(await refundsOf(purchase.id)).toHaveLength(1);
	});

	it("refunds the price paid even if the session price changed afterwards", async () => {
		const { event, customer, tickets } = await purchaseWithCombos(2);
		await db
			.update(schema.events)
			.set({ priceCents: 5000 })
			.where(eq(schema.events.id, event.id));

		const refund = await cancelTicket(ticketAt(tickets, 0).id, customer.id);

		expect(refund.amountCents).toBe(2000);
	});

	it("frees the seat so it can be held again", async () => {
		const { event, customer, tickets } = await purchaseWithCombos(1);
		await cancelTicket(ticketAt(tickets, 0).id, customer.id);
		const someoneElse = await createUser("cliente");

		await expect(holdSeats(event.id, someoneElse.id, 1)).resolves.toHaveLength(
			1,
		);
	});

	it("never refunds more than was paid, whatever the order of cancellations", async () => {
		const { customer, purchase, tickets } = await purchaseWithCombos(3);

		for (const ticket of [...tickets].reverse()) {
			await cancelTicket(ticket.id, customer.id);
		}

		const refunds = await refundsOf(purchase.id);
		expect(refunds).toHaveLength(3);
		expect(refunds.reduce((sum, r) => sum + r.amountCents, 0)).toBe(
			purchase.amountCents,
		);
	});

	it("refuses a ticket of another customer", async () => {
		const { purchase, tickets } = await purchaseWithCombos(1);
		const stranger = await createUser("cliente");

		await expect(
			cancelTicket(ticketAt(tickets, 0).id, stranger.id),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(await refundsOf(purchase.id)).toHaveLength(0);
	});

	it("refuses a ticket that was already cancelled", async () => {
		const { customer, purchase, tickets } = await purchaseWithCombos(2);
		await cancelTicket(ticketAt(tickets, 0).id, customer.id);

		await expect(
			cancelTicket(ticketAt(tickets, 0).id, customer.id),
		).rejects.toMatchObject({ code: "TICKET_ALREADY_CANCELLED" });
		expect(await refundsOf(purchase.id)).toHaveLength(1);
	});

	it("refuses a ticket that was already used", async () => {
		const { organizer, event, customer, purchase, tickets } =
			await purchaseWithCombos(1);
		await validateTicket(event.id, ticketAt(tickets, 0).code, {
			id: organizer.id,
			role: "organizador",
		});

		await expect(
			cancelTicket(ticketAt(tickets, 0).id, customer.id),
		).rejects.toMatchObject({ code: "TICKET_ALREADY_CHECKED_IN" });
		expect(await refundsOf(purchase.id)).toHaveLength(0);
	});

	it("refuses a ticket once the session has started", async () => {
		const { event, customer, purchase, tickets } = await purchaseWithCombos(1);
		await db
			.update(schema.events)
			.set({ sessionAt: new Date(Date.now() - 60_000) })
			.where(eq(schema.events.id, event.id));

		await expect(
			cancelTicket(ticketAt(tickets, 0).id, customer.id),
		).rejects.toMatchObject({ code: "EVENT_ALREADY_STARTED" });
		expect(await refundsOf(purchase.id)).toHaveLength(0);
	});

	it("refuses an unknown ticket", async () => {
		const customer = await createUser("cliente");

		await expect(
			cancelTicket(crypto.randomUUID(), customer.id),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});

describe("listMyPurchases", () => {
	it("groups tickets and combos per purchase with the paid and refunded totals", async () => {
		const { customer, purchase, tickets } = await purchaseWithCombos(2);
		await cancelTicket(ticketAt(tickets, 0).id, customer.id);
		const stranger = await createUser("cliente");
		await buyTickets(purchase.eventId, stranger.id, 1, [], 10);

		const [listed, ...others] = await listMyPurchases(customer.id);

		expect(others).toHaveLength(0);
		expect(listed).toMatchObject({
			id: purchase.id,
			amountCents: purchase.amountCents,
			refundedCents: 2000,
			event: { id: purchase.eventId },
			comboItems: [{ quantity: 2, unitPriceCents: 1500 }],
		});
		const byId = new Map(listed?.tickets.map((t) => [t.id, t]));
		expect(byId.get(ticketAt(tickets, 0).id)).toMatchObject({
			status: "cancelled",
			cancellationReason: "customer_cancelled",
			seat: { label: "A1" },
		});
		expect(byId.get(ticketAt(tickets, 1).id)).toMatchObject({
			status: "valid",
			cancellationReason: null,
		});
	});

	it("lists the most recent purchase first", async () => {
		const { event, customer, purchase } = await purchaseWithCombos(1, false);
		const { purchase: later } = await buyTickets(
			event.id,
			customer.id,
			1,
			[],
			5,
		);

		const listed = await listMyPurchases(customer.id);

		expect(listed.map((p) => p.id)).toEqual([later?.id, purchase.id]);
	});
});

async function ticketsOf(purchaseId: string) {
	return db.query.tickets.findMany({
		where: eq(schema.tickets.purchaseId, purchaseId),
	});
}

describe("cancelEvent", () => {
	it("cancels every ticket of an intact purchase and refunds all of it", async () => {
		const { organizer, event, purchase } = await purchaseWithCombos(2);

		const cancelled = await cancelEvent(event.id, organizer.id);

		expect(cancelled.status).toBe("cancelled");
		const tickets = await ticketsOf(purchase.id);
		for (const ticket of tickets) {
			expect(ticket.cancelledAt).not.toBeNull();
			expect(ticket.cancellationReason).toBe("event_cancelled");
		}
		expect(await refundsOf(purchase.id)).toMatchObject([
			{
				amountCents: purchase.amountCents,
				reason: "event_cancelled",
				ticketId: null,
			},
		]);
		const someoneElse = await createUser("cliente");
		await expect(holdSeats(event.id, someoneElse.id, 2)).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		const reservations = await db.query.reservations.findMany({
			where: eq(schema.reservations.eventId, event.id),
		});
		expect(new Set(reservations.map((r) => r.status))).toEqual(
			new Set(["cancelled"]),
		);
	});

	it("refunds only what is left of a purchase the customer partly cancelled", async () => {
		const { organizer, event, customer, purchase, tickets } =
			await purchaseWithCombos(3);
		await cancelTicket(ticketAt(tickets, 0).id, customer.id);

		await cancelEvent(event.id, organizer.id);

		const refunds = await refundsOf(purchase.id);
		expect(refunds.map((r) => [r.reason, r.amountCents])).toEqual(
			expect.arrayContaining([
				["customer_cancelled", 2000],
				["event_cancelled", 2 * 2000 + 2 * 1500],
			]),
		);
		expect(refunds.reduce((sum, r) => sum + r.amountCents, 0)).toBe(
			purchase.amountCents,
		);
		const first = (await ticketsOf(purchase.id)).find(
			(t) => t.id === ticketAt(tickets, 0).id,
		);
		expect(first?.cancellationReason).toBe("customer_cancelled");
	});

	it("does not refund a purchase that was already fully cancelled", async () => {
		const { organizer, event, customer, purchase, tickets } =
			await purchaseWithCombos(1);
		await cancelTicket(ticketAt(tickets, 0).id, customer.id);

		await cancelEvent(event.id, organizer.id);

		expect(await refundsOf(purchase.id)).toHaveLength(1);
	});

	it("leaves used tickets alone and keeps the combos of their purchase", async () => {
		const { organizer, event, purchase, tickets } = await purchaseWithCombos(2);
		const used = ticketAt(tickets, 0);
		await validateTicket(event.id, used.code, {
			id: organizer.id,
			role: "organizador",
		});

		await cancelEvent(event.id, organizer.id);

		const stored = await ticketsOf(purchase.id);
		const storedUsed = stored.find((t) => t.id === used.id);
		expect(storedUsed?.cancelledAt).toBeNull();
		expect(storedUsed?.checkedInAt).not.toBeNull();
		expect(await refundsOf(purchase.id)).toMatchObject([
			{ amountCents: 2000, reason: "event_cancelled" },
		]);
	});

	it("refunds each affected purchase separately and leaves other sessions alone", async () => {
		const { organizer, event, purchase } = await purchaseWithCombos(1, false);
		const otherCustomer = await createUser("cliente");
		const { purchase: second } = await buyTickets(
			event.id,
			otherCustomer.id,
			2,
			[],
			5,
		);
		const otherEvent = await createEvent(organizer.id);
		const { purchase: untouched } = await buyTickets(
			otherEvent.id,
			otherCustomer.id,
			1,
		);

		await cancelEvent(event.id, organizer.id);

		expect(await refundsOf(purchase.id)).toMatchObject([{ amountCents: 2000 }]);
		expect(await refundsOf(second?.id ?? "")).toMatchObject([
			{ amountCents: 4000 },
		]);
		expect(await refundsOf(untouched?.id ?? "")).toHaveLength(0);
	});

	it("refuses to cancel the session again and does not refund twice", async () => {
		const { organizer, event, purchase } = await purchaseWithCombos(2);
		await cancelEvent(event.id, organizer.id);

		await expect(cancelEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "INVALID_EVENT_TRANSITION",
		});

		expect(await refundsOf(purchase.id)).toHaveLength(1);
	});

	it("still cancels a session 1 minute before it starts", async () => {
		const { organizer, event, purchase } = await purchaseWithCombos(1);
		await db
			.update(schema.events)
			.set({ sessionAt: new Date(Date.now() + 60_000) })
			.where(eq(schema.events.id, event.id));

		const cancelled = await cancelEvent(event.id, organizer.id);

		expect(cancelled.status).toBe("cancelled");
		expect(await refundsOf(purchase.id)).toHaveLength(1);
	});

	it("refuses to cancel a session once it has started, without refunds", async () => {
		const { organizer, event, purchase } = await purchaseWithCombos(1);
		await db
			.update(schema.events)
			.set({ sessionAt: new Date() })
			.where(eq(schema.events.id, event.id));

		await expect(cancelEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "EVENT_ALREADY_STARTED",
		});

		const stored = await db.query.events.findFirst({
			where: eq(schema.events.id, event.id),
		});
		expect(stored?.status).toBe("published");
		expect(await refundsOf(purchase.id)).toHaveLength(0);
	});

	it("cancels a draft session", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "draft" });

		const cancelled = await cancelEvent(event.id, organizer.id);

		expect(cancelled.status).toBe("cancelled");
	});

	it("changes nothing when another organizer tries to cancel the session", async () => {
		const { event, purchase } = await purchaseWithCombos(1);
		const intruder = await createOrganizer();

		await expect(cancelEvent(event.id, intruder.id)).rejects.toMatchObject({
			code: "FORBIDDEN",
		});

		const stored = await db.query.events.findFirst({
			where: eq(schema.events.id, event.id),
		});
		expect(stored?.status).toBe("published");
		expect(await refundsOf(purchase.id)).toHaveLength(0);
		const [ticket] = await ticketsOf(purchase.id);
		expect(ticket?.cancelledAt).toBeNull();
	});

	it("shows the reason at the Portaria, on the share link and in the purchase list", async () => {
		const { organizer, event, customer, tickets } = await purchaseWithCombos(1);
		const ticket = ticketAt(tickets, 0);
		await cancelEvent(event.id, organizer.id);

		const checkin = await validateTicket(event.id, ticket.code, {
			id: organizer.id,
			role: "organizador",
		});
		const shared = await getTicketByShareToken(ticket.shareToken);
		const [listed] = await listMyPurchases(customer.id);

		expect(checkin).toMatchObject({
			result: "cancelled",
			reason: "event_cancelled",
		});
		expect(shared).toMatchObject({
			status: "cancelled",
			cancellationReason: "event_cancelled",
		});
		expect(listed?.tickets[0]).toMatchObject({
			status: "cancelled",
			cancellationReason: "event_cancelled",
		});
		expect(listed?.refundedCents).toBe(listed?.amountCents);
	});
});
