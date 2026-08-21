import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerCinema } from "../lib/cinemas";
import { sendDomainError } from "../lib/errors";
import { getSessionUser } from "../lib/require-role";

const registerCinemaSchema = z.object({
	cinemaName: z.string().min(1),
	cnpj: z.string().min(1),
	zipCode: z.string().min(1),
	street: z.string().min(1),
	number: z.string().min(1),
	complement: z.string().optional(),
	neighborhood: z.string().min(1),
	city: z.string().min(1),
	state: z.string().min(1),
});

export async function cinemaRoutes(fastify: FastifyInstance) {
	fastify.post("/register", async (request, reply) => {
		const user = await getSessionUser(request);
		if (!user) {
			return reply
				.status(401)
				.send({ error: "Authentication required", code: "UNAUTHENTICATED" });
		}

		const parsed = registerCinemaSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: parsed.error.message, code: "INVALID_INPUT" });
		}

		try {
			const updated = await registerCinema(user.id, parsed.data);
			return updated;
		} catch (error) {
			sendDomainError(reply, error, "Failed to register cinema");
		}
	});
}
