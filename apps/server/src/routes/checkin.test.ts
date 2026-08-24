import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, validateTicketMock, requireRoleMock } = vi.hoisted(
	() => ({
		findManyMock: vi.fn(),
		validateTicketMock: vi.fn(),
		requireRoleMock: vi.fn(),
	}),
);

vi.mock("@verzel/db", () => ({
	db: { query: { events: { findMany: findManyMock } } },
	createDb: vi.fn(() => ({})),
}));

vi.mock("../lib/checkin", () => ({ validateTicket: validateTicketMock }));
vi.mock("../lib/require-role", () => ({ requireRole: requireRoleMock }));

const { buildTestApp } = await import("../test-helpers/build-test-app");

function authAsStaff(userId = "staff-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "portaria" };
		},
	);
}

beforeEach(() => {
	findManyMock.mockReset();
	validateTicketMock.mockReset();
	requireRoleMock.mockReset();
});

describe("GET /events", () => {
	it("returns published events happening soon", async () => {
		authAsStaff();
		findManyMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/checkin/events" });

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
	});

	it("orders events by session time", async () => {
		authAsStaff();
		findManyMock.mockResolvedValue([]);
		const app = buildTestApp();

		await app.inject({ method: "GET", url: "/api/checkin/events" });

		expect(findManyMock).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: expect.anything() }),
		);
	});
});

describe("POST /:eventId/validate", () => {
	it("returns 400 for an invalid body", async () => {
		authAsStaff();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/checkin/event-1/validate",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("validates the ticket code", async () => {
		authAsStaff("staff-1");
		validateTicketMock.mockResolvedValue({ result: "valid" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/checkin/event-1/validate",
			payload: { code: "some-code" },
		});

		expect(res.json()).toEqual({ result: "valid" });
		expect(validateTicketMock).toHaveBeenCalledWith(
			"event-1",
			"some-code",
			"staff-1",
		);
	});

	it("returns a cancelled result for a cancelled ticket", async () => {
		authAsStaff("staff-1");
		validateTicketMock.mockResolvedValue({
			result: "cancelled",
			cancelledAt: "2026-01-01T00:00:00.000Z",
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/checkin/event-1/validate",
			payload: { code: "some-code" },
		});

		expect(res.json()).toEqual({
			result: "cancelled",
			cancelledAt: "2026-01-01T00:00:00.000Z",
		});
	});
});
