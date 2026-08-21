import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendDomainError } from "../lib/errors";
import { processPayment } from "../lib/payments";
import { requireRole } from "../lib/require-role";

const processPaymentSchema = z.object({
	reservationId: z.string().uuid(),
	simulateOutcome: z.enum(["approve", "decline"]),
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
				const result = await processPayment(
					parsed.data.reservationId,
					request.user?.id ?? "",
					parsed.data.simulateOutcome,
				);
				return result;
			} catch (error) {
				sendDomainError(reply, error, "Failed to process payment");
			}
		},
	);
}
