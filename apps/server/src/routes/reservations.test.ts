import { beforeEach, describe, expect, it, vi } from "vitest";

const { createHoldMock, getOwnedReservationMock, requireRoleMock } = vi.hoisted(
	() => ({
		createHoldMock: vi.fn(),
		getOwnedReservationMock: vi.fn(),
		requireRoleMock: vi.fn(),
	}),
);

vi.mock("../lib/reservations", () => ({
	createHold: createHoldMock,
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
	createHoldMock.mockReset();
	getOwnedReservationMock.mockReset();
	requireRoleMock.mockReset();
});

const validBody = { eventId: crypto.randomUUID(), row: 0, column: 0 };

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

	it("creates a reservation and returns 201", async () => {
		authAsCustomer();
		createHoldMock.mockResolvedValue({ id: "res-1", status: "holding" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/reservations",
			payload: validBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toEqual({ id: "res-1", status: "holding" });
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
