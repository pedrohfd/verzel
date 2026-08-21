import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";
import { createHold, getOwnedReservation } from "../lib/reservations";

const createReservationSchema = z.object({
	eventId: z.string().uuid(),
	seatId: z.string().uuid(),
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
				const reservation = await createHold(
					parsed.data.eventId,
					parsed.data.seatId,
					request.user?.id ?? "",
				);
				return reply.status(201).send(reservation);
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
}
