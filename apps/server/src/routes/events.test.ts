import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "../lib/errors";

const {
	listPublishedEventsMock,
	listOrganizerEventsMock,
	getPublicEventMock,
	getSeatMapMock,
	createEventMock,
	getOwnedEventMock,
	publishEventMock,
	cancelEventMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	listPublishedEventsMock: vi.fn(),
	listOrganizerEventsMock: vi.fn(),
	getPublicEventMock: vi.fn(),
	getSeatMapMock: vi.fn(),
	createEventMock: vi.fn(),
	getOwnedEventMock: vi.fn(),
	publishEventMock: vi.fn(),
	cancelEventMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/events", () => ({
	listPublishedEvents: listPublishedEventsMock,
	listOrganizerEvents: listOrganizerEventsMock,
	getPublicEvent: getPublicEventMock,
	getSeatMap: getSeatMapMock,
	createEvent: createEventMock,
	getOwnedEvent: getOwnedEventMock,
	publishEvent: publishEventMock,
	cancelEvent: cancelEventMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validCreateBody = {
	tmdbMovieId: 1,
	movieTitle: "Movie",
	moviePosterPath: null,
	movieBackdropPath: null,
	sessionAt: "2030-01-01T10:00:00Z",
	venueName: "Venue",
	venueAddress: "Address",
	priceCents: 1000,
	rows: 5,
	columns: 5,
};

function authAsOrganizer(userId = "organizer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "organizador" };
		},
	);
}

beforeEach(() => {
	for (const mock of [
		listPublishedEventsMock,
		listOrganizerEventsMock,
		getPublicEventMock,
		getSeatMapMock,
		createEventMock,
		getOwnedEventMock,
		publishEventMock,
		cancelEventMock,
		requireRoleMock,
	]) {
		mock.mockReset();
	}
});

describe("GET /", () => {
	it("lists published events", async () => {
		listPublishedEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events" });

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
	});
});

describe("GET /mine", () => {
	it("lists the organizer's own events", async () => {
		authAsOrganizer();
		listOrganizerEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events/mine" });

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
		expect(listOrganizerEventsMock).toHaveBeenCalledWith("organizer-1");
	});
});

describe("GET /:id", () => {
	it("returns the public event", async () => {
		getPublicEventMock.mockResolvedValue({ id: "event-1" });
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events/event-1" });

		expect(res.json()).toEqual({ id: "event-1" });
	});
});

describe("GET /:id/seats", () => {
	it("returns the seat map", async () => {
		getSeatMapMock.mockResolvedValue([{ id: "seat-1", status: "available" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events/event-1/seats",
		});

		expect(res.json()).toEqual({
			results: [{ id: "seat-1", status: "available" }],
		});
	});
});

describe("POST /", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/events",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("creates the event and returns 201", async () => {
		authAsOrganizer();
		createEventMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/events",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toEqual({ id: "event-1" });
	});
});

describe("PATCH /:id", () => {
	it("publishes a draft event", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		publishEventMock.mockResolvedValue({ id: "event-1", status: "published" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "publish" },
		});

		expect(res.json()).toEqual({ id: "event-1", status: "published" });
	});

	it("cancels an event", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "published" });
		cancelEventMock.mockResolvedValue({ id: "event-1", status: "cancelled" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "cancel" },
		});

		expect(res.json()).toEqual({ id: "event-1", status: "cancelled" });
	});

	it("returns 400 for an unknown action", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "unknown" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("forwards domain errors from getOwnedEvent", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "publish" },
		});

		expect(res.statusCode).toBe(403);
	});
});
