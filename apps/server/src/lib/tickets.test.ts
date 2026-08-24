import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError } from "./errors";

const { queryMock } = vi.hoisted(() => ({
	queryMock: {
		tickets: { findFirst: vi.fn() },
		reservations: { findMany: vi.fn() },
	},
}));

vi.mock("@verzel/db", () => ({
	db: { query: queryMock },
}));

const { getOwnedTicket, listMyTickets, getTicketByShareToken } = await import(
	"./tickets"
);

beforeEach(() => {
	queryMock.tickets.findFirst.mockReset();
	queryMock.reservations.findMany.mockReset();
});

const baseTicket = {
	id: "ticket-1",
	eventId: "event-1",
	issuedAt: new Date(1_700_000_000_000),
	reservation: { customerId: "customer-1" },
};

describe("getOwnedTicket", () => {
	it("throws NotFoundError when the ticket does not exist", async () => {
		queryMock.tickets.findFirst.mockResolvedValue(undefined);

		await expect(
			getOwnedTicket("missing", "customer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws ForbiddenError when the ticket belongs to someone else", async () => {
		queryMock.tickets.findFirst.mockResolvedValue(baseTicket);

		await expect(
			getOwnedTicket("ticket-1", "someone-else"),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("returns the ticket with a signed code when owned", async () => {
		queryMock.tickets.findFirst.mockResolvedValue(baseTicket);

		const result = await getOwnedTicket("ticket-1", "customer-1");

		expect(result.id).toBe("ticket-1");
		expect(typeof result.code).toBe("string");
	});
});

describe("listMyTickets", () => {
	it("filters out reservations without an issued ticket", async () => {
		queryMock.reservations.findMany.mockResolvedValue([
			{ ticket: { id: "t1" } },
			{ ticket: null },
		]);

		const result = await listMyTickets("customer-1");

		expect(result).toEqual([{ ticket: { id: "t1" } }]);
	});
});

describe("getTicketByShareToken", () => {
	it("throws NotFoundError when the token does not match a ticket", async () => {
		queryMock.tickets.findFirst.mockResolvedValue(undefined);

		await expect(getTicketByShareToken("missing")).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});

	it("returns the public ticket details", async () => {
		queryMock.tickets.findFirst.mockResolvedValue({
			id: "ticket-1",
			eventId: "event-1",
			issuedAt: new Date(1_700_000_000_000),
			checkedInAt: null,
			event: {
				movieTitle: "Some Movie",
				moviePosterPath: null,
				sessionAt: new Date(1_700_000_000_000),
				venueName: "Venue",
				venueAddress: "Address",
			},
			seat: { label: "A1" },
		});

		const result = await getTicketByShareToken("token-1");

		expect(result).toEqual({
			movieTitle: "Some Movie",
			moviePosterPath: null,
			sessionAt: new Date(1_700_000_000_000),
			venueName: "Venue",
			venueAddress: "Address",
			seatLabel: "A1",
			checkedInAt: null,
			code: expect.any(String),
		});
	});
});
