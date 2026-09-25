import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { checkout, MAX_TICKETS_PER_PURCHASE } from "../lib/purchases";
import { requireRole } from "../lib/require-role";

const processPaymentSchema = z.object({
	reservationIds: z
		.array(z.string().uuid())
		.min(1)
		.max(MAX_TICKETS_PER_PURCHASE),
	simulateOutcome: z.enum(["approve", "decline"]),
	comboItems: z
		.array(
			z.object({
				comboId: z.string().uuid(),
				quantity: z.number().int().min(1),
			}),
		)
		.optional()
		.default([]),
});

export async function paymentRoutes(fastify: FastifyInstance) {
	fastify.post(
		"/",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			const parsed = processPaymentSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply
					.status(400)
					.send({ error: "Invalid payment data", code: "INVALID_INPUT" });
			}

			try {
				return await checkout({
					reservationIds: parsed.data.reservationIds,
					customerId: request.user?.id ?? "",
					outcome: parsed.data.simulateOutcome,
					comboItems: parsed.data.comboItems,
				});
			} catch (error) {
				sendDomainError(reply, error, "Failed to process payment");
			}
		},
	);
}
