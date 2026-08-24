import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, eq, gte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { validateTicket } from "../lib/checkin";
import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";

const validateSchema = z.object({ code: z.string().min(1) });

export async function checkinRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/events",
		{ preHandler: requireRole("portaria") },
		async (_request, reply) => {
			try {
				const results = await db.query.events.findMany({
					where: and(
						eq(schema.events.status, "published"),
						gte(
							schema.events.sessionAt,
							new Date(Date.now() - 24 * 60 * 60_000),
						),
					),
					orderBy: asc(schema.events.sessionAt),
				});
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list events");
			}
		},
	);

	fastify.post<{ Params: { eventId: string } }>(
		"/:eventId/validate",
		{ preHandler: requireRole("portaria") },
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
					request.user?.id ?? "",
				);
			} catch (error) {
				sendDomainError(reply, error, "Failed to validate ticket");
			}
		},
	);
}
