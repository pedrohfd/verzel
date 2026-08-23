import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";
import {
	cancelHolds,
	createHolds,
	getOwnedReservation,
} from "../lib/reservations";

const createReservationSchema = z.object({
	eventId: z.string().uuid(),
	seats: z
		.array(
			z.object({
				row: z.number().int().min(0),
				column: z.number().int().min(0),
			}),
		)
		.min(1),
});

const cancelReservationsSchema = z.object({
	reservationIds: z.array(z.string().uuid()).min(1),
});

export async function reservationRoutes(fastify: FastifyInstance) {
	fastify.post(
		"/",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			const parsed = createReservationSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "Invalid reservation data", code: "INVALID_INPUT" });
			}

			try {
				const reservations = await createHolds(
					parsed.data.eventId,
					parsed.data.seats,
					request.user?.id ?? "",
				);
				return reply.status(201).send(reservations);
			} catch (error) {
				sendDomainError(reply, error, "Failed to create reservation");
			}
		},
	);

	fastify.get<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			try {
				return await getOwnedReservation(
					request.params.id,
					request.user?.id ?? "",
				);
			} catch (error) {
				sendDomainError(reply, error, "Failed to fetch reservation");
			}
		},
	);

	fastify.post(
		"/cancel",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			const parsed = cancelReservationsSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "Invalid cancellation data", code: "INVALID_INPUT" });
			}

			try {
				await cancelHolds(parsed.data.reservationIds, request.user?.id ?? "");
				return reply.status(204).send();
			} catch (error) {
				sendDomainError(reply, error, "Failed to cancel reservation");
			}
		},
	);
}
