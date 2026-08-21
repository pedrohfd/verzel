import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import {
	HoldExpiredError,
	NotFoundError,
	SeatAlreadyReservedError,
} from "./errors";

const { queryMock, transactionMock } = vi.hoisted(() => ({
	queryMock: {
		reservations: { findFirst: vi.fn() },
	},
	transactionMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: { query: queryMock, transaction: transactionMock },
}));

const { createHold, getOwnedReservation } = await import("./reservations");

beforeEach(() => {
	queryMock.reservations.findFirst.mockReset();
	transactionMock.mockReset();
});

describe("createHold", () => {
	it("throws NotFoundError when the seat does not exist", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				query: { seats: { findFirst: vi.fn().mockResolvedValue(undefined) } },
			}),
		);

		await expect(
			createHold("event-1", "missing-seat", "customer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("creates a holding reservation for a free seat", async () => {
		const reservation = { id: "res-1", status: "holding" };
		transactionMock.mockImplementation(async (cb) =>
			cb({
				query: {
					seats: { findFirst: vi.fn().mockResolvedValue({ id: "seat-1" }) },
				},
				update: () => mockQueryChain(undefined),
				insert: () => mockQueryChain([reservation]),
			}),
		);

		await expect(
			createHold("event-1", "seat-1", "customer-1"),
		).resolves.toEqual(reservation);
	});

	it("throws SeatAlreadyReservedError on a unique-constraint violation", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				query: {
					seats: { findFirst: vi.fn().mockResolvedValue({ id: "seat-1" }) },
				},
				update: () => mockQueryChain(undefined),
				insert: () => {
					throw { code: "23505" };
				},
			}),
		);

		await expect(
			createHold("event-1", "seat-1", "customer-1"),
		).rejects.toBeInstanceOf(SeatAlreadyReservedError);
	});

	it("rethrows unrelated errors", async () => {
		const unrelated = new Error("connection lost");
		transactionMock.mockImplementation(async (cb) =>
			cb({
				query: {
					seats: { findFirst: vi.fn().mockResolvedValue({ id: "seat-1" }) },
				},
				update: () => mockQueryChain(undefined),
				insert: () => {
					throw unrelated;
				},
			}),
		);

		await expect(createHold("event-1", "seat-1", "customer-1")).rejects.toBe(
			unrelated,
		);
	});
});

describe("getOwnedReservation", () => {
	it("throws NotFoundError when the reservation does not exist", async () => {
		queryMock.reservations.findFirst.mockResolvedValue(undefined);

		await expect(
			getOwnedReservation("missing", "customer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws HoldExpiredError when the hold has expired", async () => {
		queryMock.reservations.findFirst.mockResolvedValue({
			status: "holding",
			holdExpiresAt: new Date(Date.now() - 1000),
		});

		await expect(
			getOwnedReservation("res-1", "customer-1"),
		).rejects.toBeInstanceOf(HoldExpiredError);
	});

	it("returns the reservation when it is valid", async () => {
		const reservation = {
			status: "paid",
			holdExpiresAt: null,
		};
		queryMock.reservations.findFirst.mockResolvedValue(reservation);

		await expect(getOwnedReservation("res-1", "customer-1")).resolves.toEqual(
			reservation,
		);
	});
});
