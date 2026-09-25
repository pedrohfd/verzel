import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReservationLimitExceededError } from "../lib/errors";

const {
	cancelHoldsMock,
	countActiveHoldsMock,
	createHoldsMock,
	getOwnedReservationMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	cancelHoldsMock: vi.fn(),
	countActiveHoldsMock: vi.fn(),
	createHoldsMock: vi.fn(),
	getOwnedReservationMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/reservations", () => ({
	cancelHolds: cancelHoldsMock,
	countActiveHolds: countActiveHoldsMock,
	createHolds: createHoldsMock,
	getOwnedReservation: getOwnedReservationMock,
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
	cancelHoldsMock.mockReset();
	countActiveHoldsMock.mockReset();
	createHoldsMock.mockReset();
	getOwnedReservationMock.mockReset();
	requireRoleMock.mockReset();
});

const validBody = {
	eventId: crypto.randomUUID(),
	seats: [{ row: 0, column: 0 }],
};

describe("POST /", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsCustomer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations",
			payload: { eventId: "not-a-uuid" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("creates reservations and returns 201", async () => {
		authAsCustomer();
		createHoldsMock.mockResolvedValue([{ id: "res-1", status: "holding" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations",
			payload: validBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toEqual([{ id: "res-1", status: "holding" }]);
	});

	it("returns 409 when the customer would hold more than 10 seats", async () => {
		authAsCustomer();
		createHoldsMock.mockRejectedValue(new ReservationLimitExceededError(10));
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations",
			payload: validBody,
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "RESERVATION_LIMIT_EXCEEDED" });
	});
});

describe("GET /active-count", () => {
	it("returns 400 without a valid eventId", async () => {
		authAsCustomer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/reservations/active-count?eventId=nope",
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns how many seats the caller holds in the session and the limit", async () => {
		authAsCustomer("customer-7");
		countActiveHoldsMock.mockResolvedValue(4);
		const app = buildTestApp();
		const eventId = crypto.randomUUID();

		const res = await app.inject({
			method: "GET",
			url: `/api/reservations/active-count?eventId=${eventId}`,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ count: 4, limit: 10 });
		expect(countActiveHoldsMock).toHaveBeenCalledWith(eventId, "customer-7");
	});
});

describe("GET /:id", () => {
	it("returns the owned reservation", async () => {
		authAsCustomer();
		getOwnedReservationMock.mockResolvedValue({ id: "res-1" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/reservations/res-1",
		});

		expect(res.json()).toEqual({ id: "res-1" });
	});
});

describe("POST /cancel", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsCustomer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations/cancel",
			payload: { reservationIds: [] },
		});

		expect(res.statusCode).toBe(400);
	});

	it("cancels the given reservations for the caller and returns 204", async () => {
		authAsCustomer("customer-1");
		cancelHoldsMock.mockResolvedValue(undefined);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations/cancel",
			payload: { reservationIds: [crypto.randomUUID()] },
		});

		expect(res.statusCode).toBe(204);
		expect(cancelHoldsMock).toHaveBeenCalledWith(
			expect.any(Array),
			"customer-1",
		);
	});
});
