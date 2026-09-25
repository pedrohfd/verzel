import { beforeEach, describe, expect, it, vi } from "vitest";

import { TicketAlreadyCheckedInError } from "../lib/errors";

const {
	getTicketByShareTokenMock,
	getOwnedTicketMock,
	cancelTicketMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	getTicketByShareTokenMock: vi.fn(),
	getOwnedTicketMock: vi.fn(),
	cancelTicketMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/tickets", () => ({
	getTicketByShareToken: getTicketByShareTokenMock,
	getOwnedTicket: getOwnedTicketMock,
}));
vi.mock("../lib/purchases", () => ({
	cancelTicket: cancelTicketMock,
	MAX_TICKETS_PER_PURCHASE: 10,
}));

vi.mock("../lib/require-role", () => ({ requireRole: requireRoleMock }));

const { buildTestApp } = await import("../test-helpers/build-test-app");

function authAsCustomer(userId = "customer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "cliente" };
		},
	);
}

beforeEach(() => {
	getTicketByShareTokenMock.mockReset();
	getOwnedTicketMock.mockReset();
	cancelTicketMock.mockReset();
	requireRoleMock.mockReset();
});

describe("GET /share/:shareToken", () => {
	it("returns the public ticket for a share token", async () => {
		getTicketByShareTokenMock.mockResolvedValue({ movieTitle: "Movie" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/tickets/share/some-token",
		});

		expect(res.json()).toEqual({ movieTitle: "Movie" });
	});
});

describe("GET /:ticketId", () => {
	it("returns the owned ticket", async () => {
		authAsCustomer();
		getOwnedTicketMock.mockResolvedValue({ id: "ticket-1" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/tickets/ticket-1",
		});

		expect(res.json()).toEqual({ id: "ticket-1" });
	});
});

describe("POST /:ticketId/cancel", () => {
	it("cancels the ticket and returns the refund", async () => {
		authAsCustomer();
		const refund = {
			id: "refund-1",
			ticketId: "ticket-1",
			amountCents: 2000,
			reason: "customer_cancelled",
		};
		cancelTicketMock.mockResolvedValue(refund);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/tickets/ticket-1/cancel",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual(refund);
		expect(cancelTicketMock).toHaveBeenCalledWith("ticket-1", "customer-1");
	});

	it("maps a domain error to its status and code", async () => {
		authAsCustomer();
		cancelTicketMock.mockRejectedValue(new TicketAlreadyCheckedInError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/tickets/ticket-1/cancel",
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toEqual({
			error: "Checked-in tickets cannot be cancelled",
			code: "TICKET_ALREADY_CHECKED_IN",
		});
	});
});
