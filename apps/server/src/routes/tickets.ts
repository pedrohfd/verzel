import type { FastifyInstance } from "fastify";

import { sendDomainError } from "../lib/errors";
import { requireRole } from "../lib/require-role";
import {
	getOwnedTicket,
	getTicketByShareToken,
	listMyTickets,
} from "../lib/tickets";

export async function ticketRoutes(fastify: FastifyInstance) {
	fastify.get(
		"/mine",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			try {
				const results = await listMyTickets(request.user?.id ?? "");
				return { results };
			} catch (error) {
				sendDomainError(reply, error, "Failed to list your tickets");
			}
		},
	);

	fastify.get<{ Params: { shareToken: string } }>(
		"/share/:shareToken",
		async (request, reply) => {
			try {
				return await getTicketByShareToken(request.params.shareToken);
			} catch (error) {
				sendDomainError(reply, error, "Failed to fetch shared ticket");
			}
		},
	);

	fastify.get<{ Params: { ticketId: string } }>(
		"/:ticketId",
		{ preHandler: requireRole("cliente") },
		async (request, reply) => {
			try {
				return await getOwnedTicket(
					request.params.ticketId,
					request.user?.id ?? "",
				);
			} catch (error) {
				sendDomainError(reply, error, "Failed to fetch ticket");
			}
		},
	);
}
