import { beforeEach, describe, expect, it, vi } from "vitest";

const { processPaymentMock, requireRoleMock } = vi.hoisted(() => ({
	processPaymentMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/payments", () => ({ processPayment: processPaymentMock }));
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
	processPaymentMock.mockReset();
	requireRoleMock.mockReset();
});

describe("POST /", () => {
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

	it("processes the payments and returns the result", async () => {
		authAsCustomer();
		processPaymentMock.mockResolvedValue({
			payments: [{ id: "payment-1" }],
			tickets: [],
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/payments",
			payload: {
				reservationIds: [crypto.randomUUID()],
				simulateOutcome: "approve",
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			payments: [{ id: "payment-1" }],
			tickets: [],
		});
	});
});
