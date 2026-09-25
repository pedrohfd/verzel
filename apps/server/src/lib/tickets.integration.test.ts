import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createEvent,
	createOrganizer,
	createUser,
	holdSeats,
} from "../test-helpers/fixtures";
import { ForbiddenError, NotFoundError } from "./errors";
import {
	getOwnedTicket,
	getTicketByShareToken,
	listMyTickets,
} from "./tickets";

beforeEach(async () => {
	await resetTestData();
});

async function ticketOfEndedSession() {
	const organizer = await createOrganizer();
	const event = await createEvent(organizer.id, {
		sessionAt: new Date(Date.now() - 3 * 60 * 60_000),
		durationMinutes: 120,
	});
	const customer = await createUser("cliente");
	const { tickets } = await buyTickets(event.id, customer.id);
	const ticket = tickets[0];
	if (!ticket) throw new Error("No ticket issued");
	return { customer, ticket };
}

async function ownedTicket() {
	const organizer = await createOrganizer();
	const event = await createEvent(organizer.id);
	const customer = await createUser("cliente");
	const { tickets } = await buyTickets(event.id, customer.id);
	const ticket = tickets[0];
	if (!ticket) throw new Error("No ticket issued");
	return { event, customer, ticket };
}

describe("getOwnedTicket", () => {
	it("returns the ticket with its signed code to its owner", async () => {
		const { customer, ticket } = await ownedTicket();

		const result = await getOwnedTicket(ticket.id, customer.id);

		expect(result.id).toBe(ticket.id);
		expect(result.code).toBe(ticket.code);
		expect(result.seat.label).toBe("A1");
	});

	it("throws NotFoundError for an unknown ticket", async () => {
		const customer = await createUser("cliente");

		await expect(
			getOwnedTicket(randomUUID(), customer.id),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws ForbiddenError for someone else's ticket", async () => {
		const { ticket } = await ownedTicket();
		const stranger = await createUser("cliente");

		await expect(getOwnedTicket(ticket.id, stranger.id)).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});
});

describe("listMyTickets", () => {
	it("lists only issued tickets, leaving out seats still on hold", async () => {
		const { event, customer, ticket } = await ownedTicket();
		await holdSeats(event.id, customer.id, 1, 3);

		const results = await listMyTickets(customer.id);

		expect(results.map((entry) => entry.ticket.id)).toEqual([ticket.id]);
	});
});

describe("getTicketByShareToken", () => {
	it("returns the public details of the shared ticket", async () => {
		const { event, ticket } = await ownedTicket();

		const result = await getTicketByShareToken(ticket.shareToken);

		expect(result).toMatchObject({
			movieTitle: event.movieTitle,
			seatLabel: "A1",
			checkedInAt: null,
			cancelledAt: null,
			code: ticket.code,
		});
	});

	it("throws NotFoundError for an unknown token", async () => {
		await expect(getTicketByShareToken("missing")).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});
});

describe("ticket status", () => {
	it("shows an unused ticket of an ended session as expired everywhere", async () => {
		const { customer, ticket } = await ticketOfEndedSession();

		const owned = await getOwnedTicket(ticket.id, customer.id);
		const shared = await getTicketByShareToken(ticket.shareToken);
		const [listed] = await listMyTickets(customer.id);

		expect(owned.status).toBe("expired");
		expect(shared.status).toBe("expired");
		expect(listed?.ticket?.status).toBe("expired");
	});

	it("shows a ticket of an upcoming session as valid", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id);
		const customer = await createUser("cliente");
		const { tickets } = await buyTickets(event.id, customer.id);

		const owned = await getOwnedTicket(tickets[0]?.id ?? "", customer.id);

		expect(owned.status).toBe("valid");
	});
});
