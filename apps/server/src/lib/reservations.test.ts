import * as schema from "@verzel/db/schema";
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

const publishedEvent = {
	id: "event-1",
	status: "published",
	rows: 2,
	columns: 2,
};

beforeEach(() => {
	queryMock.reservations.findFirst.mockReset();
	transactionMock.mockReset();
});

describe("createHold", () => {
	it("throws NotFoundError when the event is not published", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([{ ...publishedEvent, status: "draft" }]),
			}),
		);

		await expect(
			createHold("event-1", 0, 0, "customer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws NotFoundError when row/column are out of bounds", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([publishedEvent]),
			}),
		);

		await expect(
			createHold("event-1", 5, 0, "customer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("creates a holding reservation for a seat never touched before", async () => {
		const reservation = { id: "res-1", status: "holding" };
		const insert = vi.fn((table: unknown) =>
			table === schema.seats
				? mockQueryChain([{ id: "seat-1", row: 0, column: 0 }])
				: mockQueryChain([reservation]),
		);

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([publishedEvent]),
				insert,
				update: () => mockQueryChain(undefined),
			}),
		);

		await expect(createHold("event-1", 0, 0, "customer-1")).resolves.toEqual(
			reservation,
		);
	});

	it("reuses an already-materialized seat when the insert conflicts", async () => {
		const reservation = { id: "res-1", status: "holding" };
		const insert = vi.fn((table: unknown) =>
			table === schema.seats
				? mockQueryChain([])
				: mockQueryChain([reservation]),
		);

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([publishedEvent]),
				insert,
				update: () => mockQueryChain(undefined),
				query: {
					seats: {
						findFirst: vi
							.fn()
							.mockResolvedValue({ id: "seat-1", row: 0, column: 0 }),
					},
				},
			}),
		);

		await expect(createHold("event-1", 0, 0, "customer-1")).resolves.toEqual(
			reservation,
		);
	});

	it("throws SeatAlreadyReservedError on a unique-constraint violation", async () => {
		const insert = vi.fn((table: unknown) => {
			if (table === schema.seats) {
				return mockQueryChain([{ id: "seat-1", row: 0, column: 0 }]);
			}
			throw { code: "23505" };
		});

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([publishedEvent]),
				insert,
				update: () => mockQueryChain(undefined),
			}),
		);

		await expect(
			createHold("event-1", 0, 0, "customer-1"),
		).rejects.toBeInstanceOf(SeatAlreadyReservedError);
	});

	it("rethrows unrelated errors", async () => {
		const unrelated = new Error("connection lost");
		const insert = vi.fn((table: unknown) => {
			if (table === schema.seats) {
				return mockQueryChain([{ id: "seat-1", row: 0, column: 0 }]);
			}
			throw unrelated;
		});

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([publishedEvent]),
				insert,
				update: () => mockQueryChain(undefined),
			}),
		);

		await expect(createHold("event-1", 0, 0, "customer-1")).rejects.toBe(
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
