import type { FastifyInstance } from "fastify";

import { sendDomainError } from "../lib/errors";
import { listMyPurchases } from "../lib/purchases";
import { requireRole } from "../lib/require-role";

export async function purchaseRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/mine",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			try {
				const results = await listMyPurchases(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your purchases");
			}
		},
	);
}
