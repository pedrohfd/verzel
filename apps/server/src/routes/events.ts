import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendDomainError } from "../lib/errors";
import {
	cancelEvent,
	createEvent,
	getOwnedEvent,
	getPublicEvent,
	getSeatMap,
	listOrganizerEvents,
	listPublishedEvents,
	publishEvent,
} from "../lib/events";
import { requireRole } from "../lib/require-role";

const createEventSchema = z.object({
	tmdbMovieId: z.number().int(),
	movieTitle: z.string().min(1),
	moviePosterPath: z.string().nullable(),
	movieBackdropPath: z.string().nullable(),
	sessionAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
	venueName: z.string().min(1),
	venueAddress: z.string().min(1),
	priceCents: z.number().int().positive(),
	rows: z.number().int().min(1).max(26),
	columns: z.number().int().min(1).max(50),
});

export async function eventRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: { search?: string } }>(
		"/",
		async (request, reply) => {
			try {
				const results = await listPublishedEvents(request.query.search);
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list events");
			}
		},
	);

	fastify.get(
		"/mine",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				const results = await listOrganizerEvents(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your events");
			}
		},
	);

	fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
		try {
			return await getPublicEvent(request.params.id);
		} catch (error) {
			sendDomainError(reply, error, "Failed to fetch event");
		}
	});

	fastify.get<{ Params: { id: string } }>(
		"/:id/seats",
		async (request, reply) => {
			try {
				const results = await getSeatMap(request.params.id);
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to fetch seat map");
			}
		},
	);

	fastify.post(
		"/",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			const parsed = createEventSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "Invalid event data",
					code: "INVALID_INPUT",
					issues: parsed.error.issues,
				});
			}

			try {
				const [event] = await createEvent({
					...parsed.data,
					sessionAt: new Date(parsed.data.sessionAt),
					organizerId: request.user?.id ?? "",
				});
				return reply.status(201).send(event);
			} catch (error) {
				sendDomainError(reply, error, "Failed to create event");
			}
		},
	);

	fastify.patch<{
		Params: { id: string };
		Body: { action: "publish" | "cancel" };
	}>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				await getOwnedEvent(request.params.id, request.user?.id ?? "");

				if (request.body.action === "publish") {
					return await publishEvent(request.params.id, request.user?.id ?? "");
				}
				if (request.body.action === "cancel") {
					return await cancelEvent(request.params.id, request.user?.id ?? "");
				}

				return reply
					.status(400)
					.send({ error: "Unknown action", code: "INVALID_INPUT" });
			} catch (error) {
				sendDomainError(reply, error, "Failed to update event");
			}
		},
	);
}
