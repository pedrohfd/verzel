import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
	createCombo,
	deleteCombo,
	getOwnedCombo,
	listActiveCombosForEvent,
	listOrganizerCombos,
	updateCombo,
} from "../lib/combos";
import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";

const createComboSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable().optional(),
	priceCents: z.number().int().min(1),
	active: z.boolean().optional().default(true),
});

export async function comboRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/mine",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				const results = await listOrganizerCombos(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your combos");
			}
		},
	);

	fastify.get<{ Params: { eventId: string } }>(
		"/for-event/:eventId",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			try {
				const results = await listActiveCombosForEvent(request.params.eventId);
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list combos for event");
			}
		},
	);

	fastify.post(
		"/",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = createComboSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid combo data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const [combo] = await createCombo({
					...parsed.data,
					description: parsed.data.description ?? null,
					organizerId: request.user?.id ?? "",
				});
				return reply.status(201).send(combo);
			} catch (error) {
				sendDomainError(reply, error, "Failed to create combo");
			}
		},
	);

	fastify.patch<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = createComboSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid combo data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const organizerId = request.user?.id ?? "";
				await getOwnedCombo(request.params.id, organizerId);
				const combo = await updateCombo(request.params.id, organizerId, {
					...parsed.data,
					description: parsed.data.description ?? null,
				});
				return reply.send(combo);
			} catch (error) {
				sendDomainError(reply, error, "Failed to update combo");
			}
		},
	);

	fastify.delete<{ Params: { id: string } }>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				await getOwnedCombo(request.params.id, request.user?.id ?? "");
				await deleteCombo(request.params.id);
				return reply.status(204).send();
			} catch (error) {
				sendDomainError(reply, error, "Failed to delete combo");
			}
		},
	);
}
