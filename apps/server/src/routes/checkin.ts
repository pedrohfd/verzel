import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	type CheckinStaff,
	listCheckinEvents,
	validateTicket,
} from "../lib/checkin";
import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";

function staffOf(request: FastifyRequest): CheckinStaff {
	return { id: request.user?.id ?? "", role: request.user?.role ?? "cliente" };
}

const validateSchema = z.object({ code: z.string().min(1) });

export async function checkinRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: { date?: string } }>(
		"/events",
		{ preHandler: requireRole("portaria", "organizador") },
		async (request, reply) => {
			try {
				const results = await listCheckinEvents(staffOf(request), {
					date: request.query.date,
				});
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list events");
			}
		},
	);

	fastify.post<{ Params: { eventId: string } }>(
		"/:eventId/validate",
		{ preHandler: requireRole("portaria", "organizador") },
		async (request, reply) => {
			const parsed = validateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "Invalid check-in data", code: "INVALID_INPUT" });
			}

			try {
				return await validateTicket(
					request.params.eventId,
					parsed.data.code,
					staffOf(request),
				);
			} catch (error) {
				sendDomainError(reply, error, "Failed to validate ticket");
			}
		},
	);
}
