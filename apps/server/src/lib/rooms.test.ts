import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import { ForbiddenError, NotFoundError, RoomInUseError } from "./errors";

const { queryMock, insertMock, updateMock, deleteMock } = vi.hoisted(() => ({
	queryMock: {
		cinemaRooms: { findMany: vi.fn(), findFirst: vi.fn() },
		events: { findFirst: vi.fn() },
	},
	insertMock: vi.fn(),
	updateMock: vi.fn(),
	deleteMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: {
		query: queryMock,
		insert: insertMock,
		update: updateMock,
		delete: deleteMock,
	},
}));

const { createRoom, listOrganizerRooms, getOwnedRoom, updateRoom, deleteRoom } =
	await import("./rooms");

const baseRoom = {
	id: "room-1",
	organizerId: "organizer-1",
	name: "Sala 1",
	rows: 8,
	columns: 10,
};

beforeEach(() => {
	queryMock.cinemaRooms.findMany.mockReset();
	queryMock.cinemaRooms.findFirst.mockReset();
	queryMock.events.findFirst.mockReset();
	insertMock.mockReset();
	updateMock.mockReset();
	deleteMock.mockReset();
});

describe("createRoom", () => {
	it("inserts the room and returns it", async () => {
		insertMock.mockReturnValue(mockQueryChain([baseRoom]));

		const result = await createRoom({
			organizerId: "organizer-1",
			name: "Sala 1",
			rows: 8,
			columns: 10,
		});

		expect(result).toEqual([baseRoom]);
	});
});

describe("listOrganizerRooms", () => {
	it("lists rooms for the organizer", async () => {
		queryMock.cinemaRooms.findMany.mockResolvedValue([baseRoom]);

		const result = await listOrganizerRooms("organizer-1");

		expect(result).toEqual([baseRoom]);
	});
});

describe("getOwnedRoom", () => {
	it("returns the room when owned by the organizer", async () => {
		queryMock.cinemaRooms.findFirst.mockResolvedValue(baseRoom);

		const result = await getOwnedRoom("room-1", "organizer-1");

		expect(result).toEqual(baseRoom);
	});

	it("throws NotFoundError when the room does not exist", async () => {
		queryMock.cinemaRooms.findFirst.mockResolvedValue(undefined);

		await expect(getOwnedRoom("room-1", "organizer-1")).rejects.toThrow(
			NotFoundError,
		);
	});

	it("throws ForbiddenError when the room belongs to another organizer", async () => {
		queryMock.cinemaRooms.findFirst.mockResolvedValue({
			...baseRoom,
			organizerId: "other-organizer",
		});

		await expect(getOwnedRoom("room-1", "organizer-1")).rejects.toThrow(
			ForbiddenError,
		);
	});
});

describe("updateRoom", () => {
	it("updates the room and returns it", async () => {
		updateMock.mockReturnValue(
			mockQueryChain([{ ...baseRoom, name: "Sala renomeada" }]),
		);

		const result = await updateRoom("room-1", {
			name: "Sala renomeada",
			rows: 8,
			columns: 10,
		});

		expect(result).toEqual({ ...baseRoom, name: "Sala renomeada" });
	});
});

describe("deleteRoom", () => {
	it("deletes the room when it is not in use by an active event", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);
		deleteMock.mockReturnValue(mockQueryChain(undefined));

		await expect(deleteRoom("room-1")).resolves.toBeUndefined();
		expect(deleteMock).toHaveBeenCalled();
	});

	it("throws RoomInUseError when a draft or published event uses the room", async () => {
		queryMock.events.findFirst.mockResolvedValue({
			id: "event-1",
			roomId: "room-1",
			status: "published",
		});

		await expect(deleteRoom("room-1")).rejects.toThrow(RoomInUseError);
		expect(deleteMock).not.toHaveBeenCalled();
	});
});
