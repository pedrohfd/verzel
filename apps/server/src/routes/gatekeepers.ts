import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { registerGatekeeper } from "../lib/gatekeepers";
import { requireRole } from "../lib/require-role";

const registerGatekeeperSchema = z.object({
	name: z.string().min(1),
	email: z.email(),
	password: z.string().min(8),
});

export async function gatekeeperRoutes(fastify: FastifyInstance) {
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
				const gatekeeper = await registerGatekeeper(parsed.data);
				return reply.status(201).send(gatekeeper);
			} catch (error) {
				sendDomainError(reply, error, "Failed to register gatekeeper");
			}
		},
	);
}
