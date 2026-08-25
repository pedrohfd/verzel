import { beforeEach, describe, expect, it, vi } from "vitest";

const { listCheckinEventsMock, validateTicketMock, requireRoleMock } =
	vi.hoisted(() => ({
		listCheckinEventsMock: vi.fn(),
		validateTicketMock: vi.fn(),
		requireRoleMock: vi.fn(),
	}));

vi.mock("../lib/checkin", () => ({
	listCheckinEvents: listCheckinEventsMock,
	validateTicket: validateTicketMock,
}));
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
	listCheckinEventsMock.mockReset();
	validateTicketMock.mockReset();
	requireRoleMock.mockReset();
});

describe("GET /events", () => {
	it("returns published events happening soon", async () => {
		authAsStaff();
		listCheckinEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/checkin/events" });

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
		expect(listCheckinEventsMock).toHaveBeenCalledWith({ date: undefined });
	});

	it("filters by an explicit date", async () => {
		authAsStaff();
		listCheckinEventsMock.mockResolvedValue([]);
		const app = buildTestApp();

		await app.inject({
			method: "GET",
			url: "/api/checkin/events?date=2026-01-01",
		});

		expect(listCheckinEventsMock).toHaveBeenCalledWith({
			date: "2026-01-01",
		});
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
