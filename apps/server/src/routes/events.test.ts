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
	updateEventMock,
	requireRoleMock,
	getCinemaByUserIdMock,
	getOwnedRoomMock,
} = vi.hoisted(() => ({
	listPublishedEventsMock: vi.fn(),
	listOrganizerEventsMock: vi.fn(),
	getPublicEventMock: vi.fn(),
	getSeatMapMock: vi.fn(),
	createEventMock: vi.fn(),
	getOwnedEventMock: vi.fn(),
	publishEventMock: vi.fn(),
	cancelEventMock: vi.fn(),
	updateEventMock: vi.fn(),
	requireRoleMock: vi.fn(),
	getCinemaByUserIdMock: vi.fn(),
	getOwnedRoomMock: vi.fn(),
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
	updateEvent: updateEventMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
}));

vi.mock("../lib/cinemas", () => ({
	getCinemaByUserId: getCinemaByUserIdMock,
}));

vi.mock("../lib/rooms", () => ({
	getOwnedRoom: getOwnedRoomMock,
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validCreateBody = {
	tmdbMovieId: 1,
	movieTitle: "Movie",
	moviePosterPath: null,
	movieBackdropPath: null,
	sessionAt: "2030-01-01T10:00:00Z",
	priceCents: 1000,
	roomId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
};

const registeredRoom = {
	id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
	organizerId: "organizer-1",
	name: "Sala 1",
	rows: 5,
	columns: 5,
};

const registeredCinema = {
	cinemaName: "Cinema Verzel",
	street: "Rua A",
	number: "100",
	complement: null,
	neighborhood: "Centro",
	city: "São Paulo",
	state: "SP",
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
		updateEventMock,
		requireRoleMock,
		getCinemaByUserIdMock,
		getOwnedRoomMock,
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
		expect(listPublishedEventsMock).toHaveBeenCalledWith({
			search: undefined,
			tmdbMovieId: undefined,
		});
	});

	it("filters by tmdbMovieId", async () => {
		listPublishedEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events?tmdbMovieId=42",
		});

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
		expect(listPublishedEventsMock).toHaveBeenCalledWith({
			search: undefined,
			tmdbMovieId: 42,
		});
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
		getCinemaByUserIdMock.mockResolvedValue(registeredCinema);
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		createEventMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/events",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toEqual({ id: "event-1" });
		expect(createEventMock).toHaveBeenCalledWith(
			expect.objectContaining({
				venueName: "Cinema Verzel",
				venueAddress: "Rua A, 100 - Centro, São Paulo/SP",
			}),
		);
	});

	it("returns 400 when the organizer has no cinema registered", async () => {
		authAsOrganizer();
		getCinemaByUserIdMock.mockResolvedValue(undefined);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/events",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "CINEMA_NOT_REGISTERED" });
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

	it("updates a draft event", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		updateEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ id: "event-1", status: "draft" });
		expect(updateEventMock).toHaveBeenCalledWith(
			"event-1",
			expect.objectContaining({ movieTitle: "Movie" }),
		);
	});

	it("returns 400 when updating with invalid data", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: {} },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 409 when updating a cancelled event", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "cancelled" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "EVENT_NOT_EDITABLE" });
	});

	it("updates a published event when rows and columns stay the same", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({
			id: "event-1",
			status: "published",
			rows: registeredRoom.rows,
			columns: registeredRoom.columns,
		});
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		updateEventMock.mockResolvedValue({ id: "event-1", status: "published" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(res.statusCode).toBe(200);
		expect(updateEventMock).toHaveBeenCalledWith(
			"event-1",
			expect.objectContaining({ movieTitle: "Movie" }),
		);
	});

	it("returns 409 when changing rows or columns of a published event", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({
			id: "event-1",
			status: "published",
			rows: registeredRoom.rows + 1,
			columns: registeredRoom.columns,
		});
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "EVENT_SEATS_LOCKED" });
	});
});
