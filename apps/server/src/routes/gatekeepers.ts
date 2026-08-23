import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import {
	deleteGatekeeper,
	listOrganizerGatekeepers,
	registerGatekeeper,
} from "../lib/gatekeepers";
import { requireRole } from "../lib/require-role";

const registerGatekeeperSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	password: z.string().min(8),
});

export async function gatekeeperRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/mine",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				const results = await listOrganizerGatekeepers(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your gatekeepers");
			}
		},
	);

	fastify.post(
		"/",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = registerGatekeeperSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid gatekeeper data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const gatekeeper = await registerGatekeeper({
					...parsed.data,
					organizerId: request.user?.id ?? "",
				});
				return reply.status(201).send(gatekeeper);
			} catch (error) {
				sendDomainError(reply, error, "Failed to register gatekeeper");
			}
		},
	);

	fastify.delete<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				await deleteGatekeeper(request.params.id, request.user?.id ?? "");
				return reply.status(204).send();
			} catch (error) {
				sendDomainError(reply, error, "Failed to delete gatekeeper");
			}
		},
	);
}
