import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMyPurchasesMock, requireRoleMock } = vi.hoisted(() => ({
	listMyPurchasesMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/purchases", () => ({
	listMyPurchases: listMyPurchasesMock,
	MAX_TICKETS_PER_PURCHASE: 10,
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
	listMyPurchasesMock.mockReset();
	requireRoleMock.mockReset();
});

describe("GET /mine", () => {
	it("returns the caller's purchases", async () => {
		authAsCustomer();
		listMyPurchasesMock.mockResolvedValue([
			{ id: "purchase-1", refundedCents: 0 },
		]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/purchases/mine" });

		expect(requireRoleMock).toHaveBeenCalledWith("cliente");
		expect(res.json()).toEqual({
			results: [{ id: "purchase-1", refundedCents: 0 }],
		});
		expect(listMyPurchasesMock).toHaveBeenCalledWith("customer-1");
	});

	it("returns 500 when listing fails", async () => {
		authAsCustomer();
		listMyPurchasesMock.mockRejectedValue(new Error("boom"));
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/purchases/mine" });

		expect(res.statusCode).toBe(500);
	});
});
