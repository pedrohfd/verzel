import { MAX_COLUMNS, MAX_ROWS } from "@verzel/shared/validators";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";
import {
	createRoom,
	deleteRoom,
	getOwnedRoom,
	getRoomSchedule,
	listOrganizerRooms,
	updateRoom,
} from "../lib/rooms";

const createRoomSchema = z.object({
	name: z.string().min(1),
	rows: z.number().int().min(1).max(MAX_ROWS),
	columns: z.number().int().min(1).max(MAX_COLUMNS),
});

export async function roomRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/mine",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				const results = await listOrganizerRooms(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your rooms");
			}
		},
	);

	fastify.get<{
		Params: { id: string };
		Querystring: { excludeEventId?: string };
	}>(
		"/:id/schedule",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				await getOwnedRoom(request.params.id, request.user?.id ?? "");
				const results = await getRoomSchedule(
					request.params.id,
					request.query.excludeEventId,
				);
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to fetch room schedule");
			}
		},
	);

	fastify.post(
		"/",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = createRoomSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid room data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const [room] = await createRoom({
					...parsed.data,
					organizerId: request.user?.id ?? "",
				});
				return reply.status(201).send(room);
			} catch (error) {
				sendDomainError(reply, error, "Failed to create room");
			}
		},
	);

	fastify.patch<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = createRoomSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid room data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const organizerId = request.user?.id ?? "";
				await getOwnedRoom(request.params.id, organizerId);
				const room = await updateRoom(
					request.params.id,
					organizerId,
					parsed.data,
				);
				return reply.send(room);
			} catch (error) {
				sendDomainError(reply, error, "Failed to update room");
			}
		},
	);

	fastify.delete<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				await getOwnedRoom(request.params.id, request.user?.id ?? "");
				await deleteRoom(request.params.id);
				return reply.status(204).send();
			} catch (error) {
				sendDomainError(reply, error, "Failed to delete room");
			}
		},
	);
}
