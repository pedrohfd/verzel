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
const { ForbiddenError } = await import("../lib/errors");

function authAsStaff(userId = "staff-1", role = "portaria") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role };
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
		expect(listCheckinEventsMock).toHaveBeenCalledWith(
			{ id: "staff-1", role: "portaria" },
			{ date: undefined },
		);
	});

	it("opens the Portaria to gatekeepers and organizers", async () => {
		authAsStaff("organizer-1", "organizador");
		listCheckinEventsMock.mockResolvedValue([]);
		const app = buildTestApp();

		await app.inject({ method: "GET", url: "/api/checkin/events" });

		expect(requireRoleMock).toHaveBeenCalledWith("portaria", "organizador");
		expect(listCheckinEventsMock).toHaveBeenCalledWith(
			{ id: "organizer-1", role: "organizador" },
			{ date: undefined },
		);
	});

	it("filters by an explicit date", async () => {
		authAsStaff();
		listCheckinEventsMock.mockResolvedValue([]);
		const app = buildTestApp();

		await app.inject({
			method: "GET",
			url: "/api/checkin/events?date=2026-01-01",
		});

		expect(listCheckinEventsMock).toHaveBeenCalledWith(
			{ id: "staff-1", role: "portaria" },
			{ date: "2026-01-01" },
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
		expect(validateTicketMock).toHaveBeenCalledWith("event-1", "some-code", {
			id: "staff-1",
			role: "portaria",
		});
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

	it("returns 403 when the session belongs to another cinema", async () => {
		authAsStaff("organizer-1", "organizador");
		validateTicketMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/checkin/event-1/validate",
			payload: { code: "some-code" },
		});

		expect(res.statusCode).toBe(403);
	});
});
