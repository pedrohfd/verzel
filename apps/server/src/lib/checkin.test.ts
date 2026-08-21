import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockQueryChain } from "../test-helpers/mock-query-chain";
import { signTicket } from "./ticket-code";

const { transactionMock } = vi.hoisted(() => ({ transactionMock: vi.fn() }));

vi.mock("@verzel/db", () => ({
	db: { transaction: transactionMock },
}));

const { validateTicket } = await import("./checkin");

beforeEach(() => {
	transactionMock.mockReset();
});

describe("validateTicket", () => {
	it("returns invalid for a malformed code", async () => {
		await expect(
			validateTicket("event-1", "not-a-valid-code", "staff-1"),
		).resolves.toEqual({ result: "invalid" });
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("returns invalid when the ticket does not exist", async () => {
		const { code } = signTicket({
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		});
		transactionMock.mockImplementation(async (cb) =>
			cb({ select: () => mockQueryChain([undefined]) }),
		);

		await expect(validateTicket("event-1", code, "staff-1")).resolves.toEqual({
			result: "invalid",
		});
	});

	it("returns wrong_event when the ticket belongs to another event", async () => {
		const { code } = signTicket({
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		});
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([{ id: "ticket-1", eventId: "other-event" }]),
			}),
		);

		await expect(validateTicket("event-1", code, "staff-1")).resolves.toEqual({
			result: "wrong_event",
			ticketEventId: "other-event",
		});
	});

	it("returns already_used when the ticket was already checked in", async () => {
		const { code } = signTicket({
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		});
		const checkedInAt = new Date(1_700_000_000_000);
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							eventId: "event-1",
							checkedInAt,
							checkedInByUserId: "other-staff",
						},
					]),
			}),
		);

		await expect(validateTicket("event-1", code, "staff-1")).resolves.toEqual({
			result: "already_used",
			checkedInAt: checkedInAt.toISOString(),
			checkedInBy: "other-staff",
		});
	});

	it("checks in a valid, unused ticket for the matching event", async () => {
		const { code } = signTicket({
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		});
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							eventId: "event-1",
							checkedInAt: null,
							checkedInByUserId: null,
							seatId: "seat-1",
							reservationId: "res-1",
						},
					]),
				update: () => mockQueryChain([{ id: "ticket-1" }]),
				query: {
					seats: { findFirst: vi.fn().mockResolvedValue({ label: "A1" }) },
					events: {
						findFirst: vi.fn().mockResolvedValue({ movieTitle: "Movie" }),
					},
					reservations: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ customer: { name: "Alice" } }),
					},
				},
			}),
		);

		await expect(validateTicket("event-1", code, "staff-1")).resolves.toEqual({
			result: "valid",
			seatLabel: "A1",
			movieTitle: "Movie",
			customerName: "Alice",
		});
	});

	it("returns already_used when it loses the race to a concurrent check-in", async () => {
		const { code } = signTicket({
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		});
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							id: "ticket-1",
							eventId: "event-1",
							checkedInAt: null,
							checkedInByUserId: null,
						},
					]),
				update: () => mockQueryChain([undefined]),
			}),
		);

		const result = await validateTicket("event-1", code, "staff-1");

		expect(result.result).toBe("already_used");
	});
});
