import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import {
	HoldExpiredError,
	NotFoundError,
	ReservationNotHoldingError,
} from "./errors";

const { transactionMock } = vi.hoisted(() => ({ transactionMock: vi.fn() }));

vi.mock("@verzel/db", () => ({
	db: { transaction: transactionMock },
}));

const { processPayment } = await import("./payments");

beforeEach(() => {
	transactionMock.mockReset();
});

const holdingReservation = {
	id: "res-1",
	customerId: "customer-1",
	status: "holding",
	holdExpiresAt: new Date(Date.now() + 60_000),
	eventId: "event-1",
	seatId: "seat-1",
};

describe("processPayment", () => {
	it("throws NotFoundError when the reservation does not exist or belongs to someone else", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({ select: () => mockQueryChain([undefined]) }),
		);

		await expect(
			processPayment(["missing"], "customer-1", "approve"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws ReservationNotHoldingError when the reservation isn't holding", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([{ ...holdingReservation, status: "paid" }]),
			}),
		);

		await expect(
			processPayment(["res-1"], "customer-1", "approve"),
		).rejects.toBeInstanceOf(ReservationNotHoldingError);
	});

	it("throws HoldExpiredError when the hold has expired", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () =>
					mockQueryChain([
						{
							...holdingReservation,
							holdExpiresAt: new Date(Date.now() - 1000),
						},
					]),
			}),
		);

		await expect(
			processPayment(["res-1"], "customer-1", "approve"),
		).rejects.toBeInstanceOf(HoldExpiredError);
	});

	it("throws ReservationNotHoldingError when reservations belong to different events", async () => {
		let selectCall = 0;
		const select = () =>
			mockQueryChain([
				selectCall++ === 0
					? holdingReservation
					: { ...holdingReservation, id: "res-2", eventId: "event-2" },
			]);

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select,
				query: {
					events: {
						findFirst: vi.fn().mockResolvedValue({ priceCents: 5000 }),
					},
				},
				insert: () => mockQueryChain([{ id: "ticket-1" }]),
				update: () => mockQueryChain([{ id: "ticket-1", signature: "sig" }]),
			}),
		);

		await expect(
			processPayment(["res-1", "res-2"], "customer-1", "approve"),
		).rejects.toBeInstanceOf(ReservationNotHoldingError);
	});

	it("approves the payments, marks the reservations paid and issues signed tickets", async () => {
		const payment = { id: "payment-1", status: "approved" };
		const ticketRow = { id: "ticket-1" };

		const insertMock = vi
			.fn()
			.mockReturnValueOnce(mockQueryChain([payment]))
			.mockReturnValueOnce(mockQueryChain([ticketRow]));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([holdingReservation]),
				query: {
					events: {
						findFirst: vi.fn().mockResolvedValue({ priceCents: 5000 }),
					},
				},
				insert: insertMock,
				update: () => mockQueryChain([{ ...ticketRow, signature: "sig" }]),
			}),
		);

		const result = await processPayment(["res-1"], "customer-1", "approve");

		expect(result.payments).toHaveLength(1);
		expect(result.tickets).toHaveLength(1);
		expect(result.tickets[0]).toMatchObject({ id: "ticket-1" });
		expect(typeof result.tickets[0]?.code).toBe("string");
	});

	it("declines the payments and cancels the reservations without issuing tickets", async () => {
		const payment = { id: "payment-1", status: "declined" };
		const updateMock = vi.fn().mockReturnValue(mockQueryChain(undefined));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([holdingReservation]),
				query: {
					events: {
						findFirst: vi.fn().mockResolvedValue({ priceCents: 5000 }),
					},
				},
				insert: () => mockQueryChain([payment]),
				update: updateMock,
			}),
		);

		const result = await processPayment(["res-1"], "customer-1", "decline");

		expect(result).toEqual({ payments: [payment], tickets: [] });
		expect(updateMock).toHaveBeenCalled();
	});

	it("adds the combo subtotal to the first payment and records the purchased items", async () => {
		const payment = { id: "payment-1", status: "approved", amountCents: 6480 };
		const ticketRow = { id: "ticket-1" };
		const insertMock = vi.fn();
		insertMock
			.mockReturnValueOnce(mockQueryChain([payment])) // payment
			.mockReturnValueOnce(mockQueryChain(undefined)) // payment_combo_items
			.mockReturnValueOnce(mockQueryChain([ticketRow])); // ticket

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([holdingReservation]),
				query: {
					events: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ priceCents: 5000, organizerId: "org-1" }),
					},
					combos: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "combo-1",
								organizerId: "org-1",
								name: "Combo Casal",
								priceCents: 4490,
							},
						]),
					},
				},
				insert: insertMock,
				update: () => mockQueryChain([{ ...ticketRow, signature: "sig" }]),
			}),
		);

		const result = await processPayment(["res-1"], "customer-1", "approve", [
			{ comboId: "combo-1", quantity: 1 },
		]);

		expect(result.payments).toHaveLength(1);
		expect(insertMock).toHaveBeenCalledTimes(3);
	});

	it("throws NotFoundError when a combo does not belong to the event's organizer", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([holdingReservation]),
				query: {
					events: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ priceCents: 5000, organizerId: "org-1" }),
					},
					combos: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "combo-1",
								organizerId: "another-org",
								name: "Combo Casal",
								priceCents: 4490,
							},
						]),
					},
				},
				insert: () => mockQueryChain([{ id: "payment-1" }]),
				update: () => mockQueryChain(undefined),
			}),
		);

		await expect(
			processPayment(["res-1"], "customer-1", "approve", [
				{ comboId: "combo-1", quantity: 1 },
			]),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
