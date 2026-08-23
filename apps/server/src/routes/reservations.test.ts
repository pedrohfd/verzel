import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	cancelHoldsMock,
	createHoldsMock,
	getOwnedReservationMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	cancelHoldsMock: vi.fn(),
	createHoldsMock: vi.fn(),
	getOwnedReservationMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/reservations", () => ({
	cancelHolds: cancelHoldsMock,
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
