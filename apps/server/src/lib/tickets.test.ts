import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockQueryChain } from "../test-helpers/mock-query-chain";
import {
	EventAlreadyStartedError,
	ForbiddenError,
	NotFoundError,
	TicketAlreadyCancelledError,
	TicketAlreadyCheckedInError,
} from "./errors";

const { queryMock, transactionMock } = vi.hoisted(() => ({
	queryMock: {
		tickets: { findFirst: vi.fn() },
		reservations: { findMany: vi.fn() },
	},
	transactionMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: { query: queryMock, transaction: transactionMock },
}));

const { cancelTicket } = await import("./tickets");

beforeEach(() => {
	queryMock.tickets.findFirst.mockReset();
	queryMock.reservations.findMany.mockReset();
	transactionMock.mockReset();
});

describe("cancelTicket", () => {
	const futureEvent = { sessionAt: new Date(Date.now() + 60_000) };

	it("throws NotFoundError when the ticket does not exist", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({ select: () => mockQueryChain([undefined]) }),
		);

		await expect(cancelTicket("missing", "customer-1")).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});

	it("throws ForbiddenError when the ticket belongs to someone else", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([{ id: "ticket-1", reservationId: "res-1" }]),
				query: {
					reservations: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ customerId: "someone-else" }),
					},
				},
			}),
		);

		await expect(cancelTicket("ticket-1", "customer-1")).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});

	it("throws TicketAlreadyCancelledError when already cancelled", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							reservationId: "res-1",
							cancelledAt: new Date(),
						},
					]),
				query: {
					reservations: {
						findFirst: vi.fn().mockResolvedValue({ customerId: "customer-1" }),
					},
				},
			}),
		);

		await expect(cancelTicket("ticket-1", "customer-1")).rejects.toBeInstanceOf(
			TicketAlreadyCancelledError,
		);
	});

	it("throws TicketAlreadyCheckedInError when already checked in", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							reservationId: "res-1",
							cancelledAt: null,
							checkedInAt: new Date(),
						},
					]),
				query: {
					reservations: {
						findFirst: vi.fn().mockResolvedValue({ customerId: "customer-1" }),
					},
				},
			}),
		);

		await expect(cancelTicket("ticket-1", "customer-1")).rejects.toBeInstanceOf(
			TicketAlreadyCheckedInError,
		);
	});

	it("throws EventAlreadyStartedError when the session has already started", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							reservationId: "res-1",
							eventId: "event-1",
							cancelledAt: null,
							checkedInAt: null,
						},
					]),
				query: {
					reservations: {
						findFirst: vi.fn().mockResolvedValue({ customerId: "customer-1" }),
					},
					events: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ sessionAt: new Date(Date.now() - 1000) }),
					},
				},
			}),
		);

		await expect(cancelTicket("ticket-1", "customer-1")).rejects.toBeInstanceOf(
			EventAlreadyStartedError,
		);
	});

	it("cancels the ticket and the underlying reservation", async () => {
		const updateMock = vi
			.fn()
			.mockReturnValueOnce(
				mockQueryChain([{ id: "ticket-1", cancelledAt: new Date() }]),
			)
			.mockReturnValueOnce(mockQueryChain(undefined));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							reservationId: "res-1",
							eventId: "event-1",
							cancelledAt: null,
							checkedInAt: null,
						},
					]),
				query: {
					reservations: {
						findFirst: vi.fn().mockResolvedValue({ customerId: "customer-1" }),
					},
					events: { findFirst: vi.fn().mockResolvedValue(futureEvent) },
				},
				update: updateMock,
			}),
		);

		const result = await cancelTicket("ticket-1", "customer-1");

		expect(result).toMatchObject({ id: "ticket-1" });
		expect(updateMock).toHaveBeenCalledTimes(2);
	});
});
