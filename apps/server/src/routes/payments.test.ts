import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkoutMock, requireRoleMock } = vi.hoisted(() => ({
	checkoutMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/purchases", () => ({
	checkout: checkoutMock,
	MAX_TICKETS_PER_PURCHASE: 10,
}));
vi.mock("../lib/require-role", () => ({ requireRole: requireRoleMock }));

const { buildTestApp } = await import("../test-helpers/build-test-app");
const { MixedSessionsError } = await import("../lib/errors");

function authAsCustomer(userId = "customer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "cliente" };
		},
	);
}

function reservationIds(count: number) {
	return Array.from({ length: count }, () => crypto.randomUUID());
}

beforeEach(() => {
	checkoutMock.mockReset();
	requireRoleMock.mockReset();
});

describe("POST /", () => {
	it("is restricted to customers", async () => {
		authAsCustomer();
		await buildTestApp().ready();

		expect(requireRoleMock).toHaveBeenCalledWith("cliente");
	});

	it("returns 400 for an invalid payload", async () => {
		authAsCustomer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: { reservationIds: ["not-a-uuid"] },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 for more than 10 reservations", async () => {
		authAsCustomer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: {
				reservationIds: reservationIds(11),
				simulateOutcome: "approve",
			},
		});

		expect(res.statusCode).toBe(400);
		expect(checkoutMock).not.toHaveBeenCalled();
	});

	it("checks out the reservations and returns the purchase", async () => {
		authAsCustomer();
		checkoutMock.mockResolvedValue({
			purchase: { id: "purchase-1", amountCents: 4000 },
			tickets: [{ id: "ticket-1" }, { id: "ticket-2" }],
		});
		const app = buildTestApp();
		const ids = reservationIds(2);

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: {
				reservationIds: ids,
				simulateOutcome: "approve",
				comboItems: [{ comboId: crypto.randomUUID(), quantity: 1 }],
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			purchase: { id: "purchase-1", amountCents: 4000 },
			tickets: [{ id: "ticket-1" }, { id: "ticket-2" }],
		});
		expect(checkoutMock).toHaveBeenCalledWith({
			reservationIds: ids,
			customerId: "customer-1",
			outcome: "approve",
			comboItems: [expect.objectContaining({ quantity: 1 })],
		});
	});

	it("answers a declined payment without a purchase", async () => {
		authAsCustomer();
		checkoutMock.mockResolvedValue({ purchase: null, tickets: [] });
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: {
				reservationIds: reservationIds(1),
				simulateOutcome: "decline",
			},
		});

		expect(res.json()).toEqual({ purchase: null, tickets: [] });
	});

	it("maps domain errors to their status", async () => {
		authAsCustomer();
		checkoutMock.mockRejectedValue(new MixedSessionsError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: {
				reservationIds: reservationIds(2),
				simulateOutcome: "approve",
			},
		});

		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "MIXED_SESSIONS" });
	});
});
