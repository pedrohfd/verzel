import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	EventAlreadyStartedError,
	EventLockedError,
	ForbiddenError,
	InvalidEventTransitionError,
	NotFoundError,
	RoomScheduleConflictError,
} from "../lib/errors";

const {
	listPublishedEventsMock,
	listPublishedVenuesMock,
	listOrganizerEventsMock,
	getPublicEventMock,
	getSeatMapMock,
	createEventMock,
	getOwnedEventMock,
	publishEventMock,
	cancelEventMock,
	updateEventMock,
	isEventLockedMock,
	requireRoleMock,
	getSessionUserMock,
	getCinemaByUserIdMock,
	getOwnedRoomMock,
	getMovieRuntimeMock,
} = vi.hoisted(() => ({
	listPublishedEventsMock: vi.fn(),
	listPublishedVenuesMock: vi.fn(),
	listOrganizerEventsMock: vi.fn(),
	getPublicEventMock: vi.fn(),
	getSeatMapMock: vi.fn(),
	createEventMock: vi.fn(),
	getOwnedEventMock: vi.fn(),
	publishEventMock: vi.fn(),
	cancelEventMock: vi.fn(),
	updateEventMock: vi.fn(),
	isEventLockedMock: vi.fn(),
	requireRoleMock: vi.fn(),
	getSessionUserMock: vi.fn(),
	getCinemaByUserIdMock: vi.fn(),
	getOwnedRoomMock: vi.fn(),
	getMovieRuntimeMock: vi.fn(),
}));

vi.mock("../lib/purchases", () => ({
	cancelEvent: cancelEventMock,
	MAX_TICKETS_PER_PURCHASE: 10,
}));
vi.mock("../lib/events", () => ({
	listPublishedEvents: listPublishedEventsMock,
	listPublishedVenues: listPublishedVenuesMock,
	listOrganizerEvents: listOrganizerEventsMock,
	getPublicEvent: getPublicEventMock,
	getSeatMap: getSeatMapMock,
	createEvent: createEventMock,
	getOwnedEvent: getOwnedEventMock,
	publishEvent: publishEventMock,
	updateEvent: updateEventMock,
	isEventLocked: isEventLockedMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
	getSessionUser: getSessionUserMock,
}));

vi.mock("../lib/cinemas", () => ({
	getCinemaByUserId: getCinemaByUserIdMock,
}));

vi.mock("../lib/rooms", () => ({
	getOwnedRoom: getOwnedRoomMock,
}));

vi.mock("../lib/tmdb", () => ({
	getMovieRuntime: getMovieRuntimeMock,
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
		listPublishedVenuesMock,
		listOrganizerEventsMock,
		getPublicEventMock,
		getSeatMapMock,
		createEventMock,
		getOwnedEventMock,
		publishEventMock,
		cancelEventMock,
		updateEventMock,
		isEventLockedMock,
		requireRoleMock,
		getSessionUserMock,
		getCinemaByUserIdMock,
		getOwnedRoomMock,
		getMovieRuntimeMock,
	]) {
		mock.mockReset();
	}
	getMovieRuntimeMock.mockResolvedValue(120);
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

	it("filters by date, venue and price range", async () => {
		listPublishedEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events?date=2026-01-01&venue=Cine%20Downtown&priceMin=1000&priceMax=5000",
		});

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
		expect(listPublishedEventsMock).toHaveBeenCalledWith({
			search: undefined,
			tmdbMovieId: undefined,
			organizerId: undefined,
			date: "2026-01-01",
			venue: "Cine Downtown",
			priceMinCents: 1000,
			priceMaxCents: 5000,
		});
	});
});

describe("GET /venues", () => {
	it("lists distinct published venues", async () => {
		listPublishedVenuesMock.mockResolvedValue(["Cine Downtown", "Cine Norte"]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events/venues" });

		expect(res.json()).toEqual({
			results: ["Cine Downtown", "Cine Norte"],
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
		expect(listOrganizerEventsMock).toHaveBeenCalledWith("organizer-1", {
			status: undefined,
			search: undefined,
		});
	});

	it("filters by status and search", async () => {
		authAsOrganizer();
		listOrganizerEventsMock.mockResolvedValue([{ id: "event-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events/mine?status=published&q=matrix",
		});

		expect(res.json()).toEqual({ results: [{ id: "event-1" }] });
		expect(listOrganizerEventsMock).toHaveBeenCalledWith("organizer-1", {
			status: "published",
			search: "matrix",
		});
	});
});

describe("GET /:id", () => {
	it("returns the public event to a visitor", async () => {
		getSessionUserMock.mockResolvedValue(null);
		getPublicEventMock.mockResolvedValue({ id: "event-1" });
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events/event-1" });

		expect(res.json()).toEqual({ id: "event-1" });
		expect(getPublicEventMock).toHaveBeenCalledWith("event-1", null);
	});

	it("lets the signed-in organizer see their own unpublished session", async () => {
		getSessionUserMock.mockResolvedValue({
			id: "organizer-1",
			role: "organizador",
		});
		getPublicEventMock.mockResolvedValue({ id: "event-1", status: "draft" });
		const app = buildTestApp();

		await app.inject({ method: "GET", url: "/api/events/event-1" });

		expect(getPublicEventMock).toHaveBeenCalledWith("event-1", "organizer-1");
	});

	it("answers 404 for a session hidden from the viewer", async () => {
		getSessionUserMock.mockResolvedValue(null);
		getPublicEventMock.mockRejectedValue(new NotFoundError("Event"));
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/events/event-1" });

		expect(res.statusCode).toBe(404);
	});
});

describe("GET /:id/seats", () => {
	it("returns the seat map", async () => {
		getSessionUserMock.mockResolvedValue({
			id: "organizer-1",
			role: "organizador",
		});
		getSeatMapMock.mockResolvedValue([{ id: "seat-1", status: "available" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events/event-1/seats",
		});

		expect(res.json()).toEqual({
			results: [{ id: "seat-1", status: "available" }],
		});
		expect(getSeatMapMock).toHaveBeenCalledWith("event-1", "organizer-1");
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

	it("returns 409 when the room already has an overlapping session", async () => {
		authAsOrganizer();
		getCinemaByUserIdMock.mockResolvedValue(registeredCinema);
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		createEventMock.mockRejectedValue(new RoomScheduleConflictError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/events",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "ROOM_SCHEDULE_CONFLICT" });
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

	it("returns 409 when the session cannot make the transition", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "cancelled" });
		publishEventMock.mockRejectedValue(
			new InvalidEventTransitionError("cancelled", "published"),
		);
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "publish" },
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "INVALID_EVENT_TRANSITION" });
	});

	it("returns 409 when cancelling a session that has already started", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1", status: "published" });
		cancelEventMock.mockRejectedValue(new EventAlreadyStartedError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "cancel" },
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "EVENT_ALREADY_STARTED" });
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

	it("returns 409 when the session is locked by reserved or occupied seats", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({
			id: "event-1",
			status: "published",
			tmdbMovieId: 1,
			durationMinutes: 100,
		});
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		updateEventMock.mockRejectedValue(new EventLockedError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toMatchObject({ code: "EVENT_LOCKED" });
	});

	it("keeps the stored duration when the movie does not change", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({
			id: "event-1",
			status: "published",
			tmdbMovieId: validCreateBody.tmdbMovieId,
			durationMinutes: 100,
		});
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		updateEventMock.mockResolvedValue({ id: "event-1" });
		const app = buildTestApp();

		await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(getMovieRuntimeMock).not.toHaveBeenCalled();
		expect(updateEventMock).toHaveBeenCalledWith(
			"event-1",
			expect.objectContaining({ durationMinutes: 100 }),
		);
	});
});

describe("PATCH /:id grid", () => {
	it("keeps the session grid when the room stays the same, even if the room was resized", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({
			id: "event-1",
			status: "published",
			roomId: registeredRoom.id,
			rows: 3,
			columns: 4,
			tmdbMovieId: validCreateBody.tmdbMovieId,
			durationMinutes: 100,
		});
		getOwnedRoomMock.mockResolvedValue(registeredRoom);
		updateEventMock.mockResolvedValue({ id: "event-1" });
		const app = buildTestApp();

		await app.inject({
			method: "PATCH",
			url: "/api/events/event-1",
			payload: { action: "update", data: validCreateBody },
		});

		expect(updateEventMock).toHaveBeenCalledWith(
			"event-1",
			expect.objectContaining({ rows: 3, columns: 4 }),
		);
	});
});

describe("GET /:id/lock", () => {
	it("tells the owner whether the session is locked", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockResolvedValue({ id: "event-1" });
		isEventLockedMock.mockResolvedValue(true);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events/event-1/lock",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ locked: true });
		expect(getOwnedEventMock).toHaveBeenCalledWith("event-1", "organizer-1");
	});

	it("refuses another organizer's session", async () => {
		authAsOrganizer();
		getOwnedEventMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/events/event-1/lock",
		});

		expect(res.statusCode).toBe(403);
		expect(isEventLockedMock).not.toHaveBeenCalled();
	});
});
