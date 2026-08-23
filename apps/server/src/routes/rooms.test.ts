import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, RoomInUseError } from "../lib/errors";

const {
	createRoomMock,
	listOrganizerRoomsMock,
	getOwnedRoomMock,
	updateRoomMock,
	deleteRoomMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	createRoomMock: vi.fn(),
	listOrganizerRoomsMock: vi.fn(),
	getOwnedRoomMock: vi.fn(),
	updateRoomMock: vi.fn(),
	deleteRoomMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/rooms", () => ({
	createRoom: createRoomMock,
	listOrganizerRooms: listOrganizerRoomsMock,
	getOwnedRoom: getOwnedRoomMock,
	updateRoom: updateRoomMock,
	deleteRoom: deleteRoomMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validCreateBody = {
	name: "Sala 1",
	rows: 8,
	columns: 10,
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
		createRoomMock,
		listOrganizerRoomsMock,
		getOwnedRoomMock,
		updateRoomMock,
		deleteRoomMock,
		requireRoleMock,
	]) {
		mock.mockReset();
	}
});

describe("GET /mine", () => {
	it("lists the organizer's own rooms", async () => {
		authAsOrganizer();
		listOrganizerRoomsMock.mockResolvedValue([{ id: "room-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/rooms/mine" });

		expect(res.json()).toEqual({ results: [{ id: "room-1" }] });
		expect(listOrganizerRoomsMock).toHaveBeenCalledWith("organizer-1");
	});
});

describe("POST /", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/rooms",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when columns exceeds the maximum of 14", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/rooms",
			payload: { ...validCreateBody, columns: 15 },
		});

		expect(res.statusCode).toBe(400);
	});

	it("creates the room and returns 201", async () => {
		authAsOrganizer();
		createRoomMock.mockResolvedValue([
			{ id: "room-1", organizerId: "organizer-1", ...validCreateBody },
		]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/rooms",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toMatchObject({ id: "room-1", name: "Sala 1" });
		expect(createRoomMock).toHaveBeenCalledWith(
			expect.objectContaining({ organizerId: "organizer-1", name: "Sala 1" }),
		);
	});

	it("forwards domain errors from createRoom", async () => {
		authAsOrganizer();
		createRoomMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/rooms",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(403);
	});
});

describe("PATCH /:id", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/rooms/room-1",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("updates the room and returns it", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockResolvedValue({
			id: "room-1",
			organizerId: "organizer-1",
			...validCreateBody,
		});
		updateRoomMock.mockResolvedValue({
			id: "room-1",
			organizerId: "organizer-1",
			name: "Sala renomeada",
			rows: 8,
			columns: 10,
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/rooms/room-1",
			payload: { ...validCreateBody, name: "Sala renomeada" },
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ id: "room-1", name: "Sala renomeada" });
		expect(getOwnedRoomMock).toHaveBeenCalledWith("room-1", "organizer-1");
		expect(updateRoomMock).toHaveBeenCalledWith("room-1", "organizer-1", {
			...validCreateBody,
			name: "Sala renomeada",
		});
	});

	it("returns 404 when the room does not exist", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockRejectedValue(new NotFoundError("Room"));
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/rooms/room-1",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(404);
	});

	it("returns 403 when the room belongs to another organizer", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/rooms/room-1",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(403);
	});
});

describe("DELETE /:id", () => {
	it("deletes the room and returns 204", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockResolvedValue({
			id: "room-1",
			organizerId: "organizer-1",
			...validCreateBody,
		});
		deleteRoomMock.mockResolvedValue(undefined);
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/rooms/room-1",
		});

		expect(res.statusCode).toBe(204);
		expect(getOwnedRoomMock).toHaveBeenCalledWith("room-1", "organizer-1");
		expect(deleteRoomMock).toHaveBeenCalledWith("room-1");
	});

	it("returns 404 when the room does not exist", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockRejectedValue(new NotFoundError("Room"));
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/rooms/room-1",
		});

		expect(res.statusCode).toBe(404);
	});

	it("returns 403 when the room belongs to another organizer", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/rooms/room-1",
		});

		expect(res.statusCode).toBe(403);
	});

	it("returns 409 when the room is in use by an active event", async () => {
		authAsOrganizer();
		getOwnedRoomMock.mockResolvedValue({
			id: "room-1",
			organizerId: "organizer-1",
			...validCreateBody,
		});
		deleteRoomMock.mockRejectedValue(new RoomInUseError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/rooms/room-1",
		});

		expect(res.statusCode).toBe(409);
	});
});
