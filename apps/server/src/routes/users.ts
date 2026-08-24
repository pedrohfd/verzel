import {
	BRAZILIAN_STATES,
	isValidCnpj,
	onlyDigits,
} from "@verzel/shared/validators";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendDomainError } from "../lib/errors";
import { getSessionUser } from "../lib/require-role";
import { getUserProfile, updateUserProfile } from "../lib/users";

const baseProfileSchema = z.object({
	name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
	email: z.email("E-mail inválido"),
});

const organizerProfileSchema = baseProfileSchema.extend({
	cinemaName: z.string().min(1),
	cnpj: z.string().refine(isValidCnpj, "CNPJ inválido").transform(onlyDigits),
	zipCode: z
		.string()
		.regex(/^\d{5}-\d{3}$/, "CEP inválido")
		.transform(onlyDigits),
	street: z.string().min(1),
	number: z.string().min(1),
	complement: z.string().optional(),
	neighborhood: z.string().min(1),
	city: z.string().min(1),
	state: z.enum(BRAZILIAN_STATES),
});

export async function userRoutes(fastify: FastifyInstance) {
	fastify.get("/me", async (request, reply) => {
		const user = await getSessionUser(request);
		if (!user) {
			return reply
				.status(401)
				.send({ error: "Authentication required", code: "UNAUTHENTICATED" });
		}

		return getUserProfile(user.id);
	});

	fastify.patch("/me", async (request, reply) => {
		const user = await getSessionUser(request);
		if (!user) {
			return reply
				.status(401)
				.send({ error: "Authentication required", code: "UNAUTHENTICATED" });
		}

		const schema =
			user.role === "organizador" ? organizerProfileSchema : baseProfileSchema;
		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: parsed.error.message, code: "INVALID_INPUT" });
		}

		try {
			const updated = await updateUserProfile(user.id, user.role, parsed.data);
			return updated;
		} catch (error) {
			sendDomainError(reply, error, "Failed to update profile");
		}
	});
}
