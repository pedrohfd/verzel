import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCinemaByUserId } from "../lib/cinemas";
import {
	CinemaNotRegisteredError,
	EventNotEditableError,
	EventSeatsLockedError,
	sendDomainError,
} from "../lib/errors";
import {
	cancelEvent,
	createEvent,
	getOwnedEvent,
	getPublicEvent,
	getSeatMap,
	listOrganizerEvents,
	listPublishedEvents,
	publishEvent,
	updateEvent,
} from "../lib/events";
import { formatAddress } from "../lib/format-address";
import { requireRole } from "../lib/require-role";
import { getOwnedRoom } from "../lib/rooms";
import { getMovieRuntime } from "../lib/tmdb";

const createEventSchema = z.object({
	tmdbMovieId: z.number().int(),
	movieTitle: z.string().min(1),
	moviePosterPath: z.string().nullable(),
	movieBackdropPath: z.string().nullable(),
	sessionAt: z
		.string()
		.datetime({ offset: true })
		.or(z.string().min(1))
		.refine(
			(value) => new Date(value) > new Date(),
			"A sessão deve ser no futuro",
		),
	priceCents: z.number().int().positive(),
	roomId: z.string().uuid(),
});

export async function eventRoutes(fastify: FastifyInstance) {
	fastify.get<{
		Querystring: {
			search?: string;
			tmdbMovieId?: string;
			organizerId?: string;
		};
	}>("/", async (request, reply) => {
		try {
			const { search, tmdbMovieId, organizerId } = request.query;
			const results = await listPublishedEvents({
				search,
				tmdbMovieId: tmdbMovieId ? Number(tmdbMovieId) : undefined,
				organizerId,
			});
			return { results };
		} catch (error) {
			sendDomainError(reply, error, "Failed to list events");
		}
	});

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
				const cinema = await getCinemaByUserId(request.user?.id ?? "");
				if (
					!cinema?.cinemaName ||
					!cinema.street ||
					!cinema.number ||
					!cinema.neighborhood ||
					!cinema.city ||
					!cinema.state
				) {
					throw new CinemaNotRegisteredError();
				}

				const room = await getOwnedRoom(
					parsed.data.roomId,
					request.user?.id ?? "",
				);
				const durationMinutes = await getMovieRuntime(parsed.data.tmdbMovieId);

				const [event] = await createEvent({
					...parsed.data,
					sessionAt: new Date(parsed.data.sessionAt),
					durationMinutes,
					organizerId: request.user?.id ?? "",
					venueName: cinema.cinemaName,
					venueAddress: formatAddress({
						street: cinema.street,
						number: cinema.number,
						complement: cinema.complement,
						neighborhood: cinema.neighborhood,
						city: cinema.city,
						state: cinema.state,
					}),
					rows: room.rows,
					columns: room.columns,
				});
				return reply.status(201).send(event);
			} catch (error) {
				sendDomainError(reply, error, "Failed to create event");
			}
		},
	);

	fastify.patch<{
		Params: { id: string };
		Body:
			| { action: "publish" | "cancel" }
			| { action: "update"; data: unknown };
	}>(
		"/:id",
		{ preHandler: requireRole("organizador") },
		async (request, reply) => {
			try {
				const event = await getOwnedEvent(
					request.params.id,
					request.user?.id ?? "",
				);

				if (request.body.action === "publish") {
					return await publishEvent(request.params.id, request.user?.id ?? "");
				}
				if (request.body.action === "cancel") {
					return await cancelEvent(request.params.id, request.user?.id ?? "");
				}
				if (request.body.action === "update") {
					if (event.status === "cancelled") throw new EventNotEditableError();

					const parsed = createEventSchema.safeParse(request.body.data);
					if (!parsed.success) {
						return reply.status(400).send({
							error: "Invalid event data",
							code: "INVALID_INPUT",
							issues: parsed.error.issues,
						});
					}

					const room = await getOwnedRoom(
						parsed.data.roomId,
						request.user?.id ?? "",
					);

					if (
						event.status === "published" &&
						(room.rows !== event.rows || room.columns !== event.columns)
					) {
						throw new EventSeatsLockedError();
					}

					const durationMinutes = await getMovieRuntime(
						parsed.data.tmdbMovieId,
					);

					return await updateEvent(request.params.id, {
						...parsed.data,
						sessionAt: new Date(parsed.data.sessionAt),
						durationMinutes,
						rows: room.rows,
						columns: room.columns,
					});
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
