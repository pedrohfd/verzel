import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import {
	ForbiddenError,
	NotFoundError,
	RoomScheduleConflictError,
} from "./errors";

const { queryMock, insertMock, transactionMock } = vi.hoisted(() => ({
	queryMock: {
		events: { findFirst: vi.fn(), findMany: vi.fn() },
		seats: { findMany: vi.fn() },
		reservations: { findMany: vi.fn() },
	},
	insertMock: vi.fn(),
	transactionMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: {
		query: queryMock,
		insert: insertMock,
		transaction: transactionMock,
		update: vi.fn(),
	},
}));

const {
	createEvent,
	updateEvent,
	getOwnedEvent,
	cancelEvent,
	listPublishedEvents,
	listOrganizerEvents,
	getPublicEvent,
	getSeatMap,
	publishEvent,
} = await import("./events");

const baseEvent = {
	id: "event-1",
	organizerId: "organizer-1",
	movieTitle: "Some Movie",
	status: "draft",
	rows: 1,
	columns: 1,
	sessionAt: new Date(),
};

beforeEach(() => {
	queryMock.events.findFirst.mockReset();
	queryMock.events.findMany.mockReset();
	queryMock.seats.findMany.mockReset();
	queryMock.reservations.findMany.mockReset();
	insertMock.mockReset();
	transactionMock.mockReset();
});

describe("createEvent", () => {
	it("inserts the event and returns it", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);
		insertMock.mockReturnValue(mockQueryChain([baseEvent]));

		const result = await createEvent({
			organizerId: "organizer-1",
			tmdbMovieId: 1,
			movieTitle: "Some Movie",
			moviePosterPath: null,
			movieBackdropPath: null,
			sessionAt: new Date(),
			durationMinutes: 120,
			venueName: "Venue",
			venueAddress: "Address",
			priceCents: 1000,
			roomId: "room-1",
			rows: 1,
			columns: 1,
		});

		expect(result).toEqual([baseEvent]);
	});

	it("throws RoomScheduleConflictError when the room already has an overlapping session", async () => {
		queryMock.events.findFirst.mockResolvedValue({
			...baseEvent,
			id: "event-2",
		});

		await expect(
			createEvent({
				organizerId: "organizer-1",
				tmdbMovieId: 1,
				movieTitle: "Some Movie",
				moviePosterPath: null,
				movieBackdropPath: null,
				sessionAt: new Date(),
				durationMinutes: 120,
				venueName: "Venue",
				venueAddress: "Address",
				priceCents: 1000,
				roomId: "room-1",
				rows: 1,
				columns: 1,
			}),
		).rejects.toBeInstanceOf(RoomScheduleConflictError);

		expect(insertMock).not.toHaveBeenCalled();
	});
});

describe("updateEvent", () => {
	it("updates the event and returns it", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);
		const updateMock = vi
			.fn()
			.mockReturnValue(mockQueryChain([{ ...baseEvent, priceCents: 2000 }]));
		vi.mocked((await import("@verzel/db")).db).update = updateMock;

		const result = await updateEvent("event-1", {
			tmdbMovieId: 1,
			movieTitle: "Some Movie",
			moviePosterPath: null,
			movieBackdropPath: null,
			sessionAt: new Date(),
			durationMinutes: 120,
			priceCents: 2000,
			roomId: "room-1",
			rows: 1,
			columns: 1,
		});

		expect(result).toEqual({ ...baseEvent, priceCents: 2000 });
	});

	it("throws RoomScheduleConflictError when the room already has an overlapping session", async () => {
		queryMock.events.findFirst.mockResolvedValue({
			...baseEvent,
			id: "event-2",
		});
		const updateMock = vi.fn();
		vi.mocked((await import("@verzel/db")).db).update = updateMock;

		await expect(
			updateEvent("event-1", {
				tmdbMovieId: 1,
				movieTitle: "Some Movie",
				moviePosterPath: null,
				movieBackdropPath: null,
				sessionAt: new Date(),
				durationMinutes: 120,
				priceCents: 2000,
				roomId: "room-1",
				rows: 1,
				columns: 1,
			}),
		).rejects.toBeInstanceOf(RoomScheduleConflictError);

		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe("getOwnedEvent", () => {
	it("returns the event when found and owned", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);

		await expect(getOwnedEvent("event-1", "organizer-1")).resolves.toEqual(
			baseEvent,
		);
	});

	it("throws NotFoundError when the event does not exist", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);

		await expect(
			getOwnedEvent("missing", "organizer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	it("throws ForbiddenError when the organizer does not own the event", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);

		await expect(
			getOwnedEvent("event-1", "someone-else"),
		).rejects.toBeInstanceOf(ForbiddenError);
	});
});

describe("cancelEvent", () => {
	it("cancels an owned event", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);
		const updateMock = vi
			.fn()
			.mockReturnValue(mockQueryChain([{ ...baseEvent, status: "cancelled" }]));
		vi.mocked((await import("@verzel/db")).db).update = updateMock;

		const result = await cancelEvent("event-1", "organizer-1");

		expect(result).toEqual({ ...baseEvent, status: "cancelled" });
	});

	it("throws when the event is not owned", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);

		await expect(cancelEvent("event-1", "someone-else")).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});
});

describe("listPublishedEvents", () => {
	it("returns all published events with their room name when no search term is given", async () => {
		queryMock.events.findMany.mockResolvedValue([
			{ ...baseEvent, room: { name: "2" } },
		]);

		await expect(listPublishedEvents()).resolves.toEqual([
			{ ...baseEvent, roomName: "2" },
		]);
	});

	it("returns null roomName when the event has no room", async () => {
		queryMock.events.findMany.mockResolvedValue([{ ...baseEvent, room: null }]);

		await expect(listPublishedEvents()).resolves.toEqual([
			{ ...baseEvent, roomName: null },
		]);
	});

	it("filters events by case-insensitive movie title", async () => {
		queryMock.events.findMany.mockResolvedValue([
			{ ...baseEvent, room: { name: "2" } },
		]);

		await expect(listPublishedEvents({ search: "some" })).resolves.toEqual([
			{ ...baseEvent, roomName: "2" },
		]);
		await expect(listPublishedEvents({ search: "nomatch" })).resolves.toEqual(
			[],
		);
	});

	it("filters events by tmdbMovieId", async () => {
		queryMock.events.findMany.mockResolvedValue([
			{ ...baseEvent, room: { name: "2" } },
		]);

		await expect(listPublishedEvents({ tmdbMovieId: 42 })).resolves.toEqual([
			{ ...baseEvent, roomName: "2" },
		]);
	});
});

describe("listOrganizerEvents", () => {
	it("returns events for the organizer", async () => {
		queryMock.events.findMany.mockResolvedValue([baseEvent]);

		await expect(listOrganizerEvents("organizer-1")).resolves.toEqual([
			baseEvent,
		]);
	});
});

describe("getPublicEvent", () => {
	it("returns the event when found", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);

		await expect(getPublicEvent("event-1")).resolves.toEqual(baseEvent);
	});

	it("throws NotFoundError when missing", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);

		await expect(getPublicEvent("missing")).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});
});

describe("getSeatMap", () => {
	it("returns an empty grid for draft events", async () => {
		queryMock.events.findFirst.mockResolvedValue(baseEvent);

		await expect(getSeatMap("event-1")).resolves.toEqual([]);
	});

	it("marks seats with a live reservation as taken and the rest as available", async () => {
		queryMock.events.findFirst.mockResolvedValue({
			...baseEvent,
			status: "published",
			rows: 1,
			columns: 2,
		});
		queryMock.reservations.findMany.mockResolvedValue([
			{ seat: { row: 0, column: 0 } },
		]);

		const result = await getSeatMap("event-1");

		expect(result).toEqual([
			{ eventId: "event-1", row: 0, column: 0, label: "A1", status: "taken" },
			{
				eventId: "event-1",
				row: 0,
				column: 1,
				label: "A2",
				status: "available",
			},
		]);
	});
});

describe("publishEvent", () => {
	it("throws NotFoundError when the event does not exist", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([undefined]),
			}),
		);

		await expect(publishEvent("missing", "organizer-1")).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});

	it("throws ForbiddenError when the organizer does not own the event", async () => {
		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([baseEvent]),
			}),
		);

		await expect(
			publishEvent("event-1", "someone-else"),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("publishes a draft event without creating any seats", async () => {
		const updateEvent = vi
			.fn()
			.mockReturnValue(mockQueryChain([{ ...baseEvent, status: "published" }]));

		transactionMock.mockImplementation(async (cb) =>
			cb({
				select: () => mockQueryChain([baseEvent]),
				update: updateEvent,
			}),
		);

		const result = await publishEvent("event-1", "organizer-1");

		expect(result).toEqual({ ...baseEvent, status: "published" });
	});
});
