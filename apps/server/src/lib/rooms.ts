import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, eq, inArray, ne } from "drizzle-orm";

import {
	DuplicateRoomNameError,
	ForbiddenError,
	NotFoundError,
	RoomInUseError,
} from "./errors";

export interface CreateRoomInput {
	organizerId: string;
	name: string;
	rows: number;
	columns: number;
}

async function assertNoDuplicateName(
	organizerId: string,
	name: string,
	excludeRoomId?: string,
) {
	const existing = await db.query.cinemaRooms.findFirst({
		where: and(
			eq(schema.cinemaRooms.organizerId, organizerId),
			eq(schema.cinemaRooms.name, name),
			excludeRoomId ? ne(schema.cinemaRooms.id, excludeRoomId) : undefined,
		),
	});
	if (existing) throw new DuplicateRoomNameError();
}

export async function createRoom(input: CreateRoomInput) {
	await assertNoDuplicateName(input.organizerId, input.name);
	return db.insert(schema.cinemaRooms).values(input).returning();
}

export function listOrganizerRooms(organizerId: string) {
	return db.query.cinemaRooms.findMany({
		where: eq(schema.cinemaRooms.organizerId, organizerId),
		orderBy: asc(schema.cinemaRooms.createdAt),
	});
}

export async function getOwnedRoom(roomId: string, organizerId: string) {
	const room = await db.query.cinemaRooms.findFirst({
		where: eq(schema.cinemaRooms.id, roomId),
	});
	if (!room) throw new NotFoundError("Room");
	if (room.organizerId !== organizerId) throw new ForbiddenError();
	return room;
}

export interface UpdateRoomInput {
	name: string;
	rows: number;
	columns: number;
}

export async function updateRoom(
	roomId: string,
	organizerId: string,
	patch: UpdateRoomInput,
) {
	await assertNoDuplicateName(organizerId, patch.name, roomId);
	const [room] = await db
		.update(schema.cinemaRooms)
		.set(patch)
		.where(eq(schema.cinemaRooms.id, roomId))
		.returning();
	return room;
}

export async function deleteRoom(roomId: string) {
	const activeEvent = await db.query.events.findFirst({
		where: and(
			eq(schema.events.roomId, roomId),
			inArray(schema.events.status, ["draft", "published"]),
		),
	});
	if (activeEvent) throw new RoomInUseError();

	await db.delete(schema.cinemaRooms).where(eq(schema.cinemaRooms.id, roomId));
}
