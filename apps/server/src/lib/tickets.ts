import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";

import { ForbiddenError, NotFoundError } from "./errors";
import { signTicket } from "./ticket-code";
import { ticketStatus } from "./ticket-status";

async function loadTicketDetail(ticketId: string) {
	const ticket = await db.query.tickets.findFirst({
		where: eq(schema.tickets.id, ticketId),
		with: {
			event: true,
			seat: true,
			reservation: { with: { customer: true } },
		},
	});
	if (!ticket) throw new NotFoundError("Ticket");
	return ticket;
}

export async function getOwnedTicket(ticketId: string, customerId: string) {
	const ticket = await loadTicketDetail(ticketId);
	if (ticket.reservation.customerId !== customerId) throw new ForbiddenError();

	const { code } = signTicket({
		ticketId: ticket.id,
		eventId: ticket.eventId,
		issuedAt: ticket.issuedAt.getTime(),
	});

	return { ...ticket, code, status: ticketStatus(ticket, ticket.event) };
}

export async function getTicketByShareToken(shareToken: string) {
	const ticket = await db.query.tickets.findFirst({
		where: eq(schema.tickets.shareToken, shareToken),
		with: { event: true, seat: true },
	});
	if (!ticket) throw new NotFoundError("Ticket");

	const { code } = signTicket({
		ticketId: ticket.id,
		eventId: ticket.eventId,
		issuedAt: ticket.issuedAt.getTime(),
	});

	return {
		movieTitle: ticket.event.movieTitle,
		moviePosterPath: ticket.event.moviePosterPath,
		sessionAt: ticket.event.sessionAt,
		venueName: ticket.event.venueName,
		venueAddress: ticket.event.venueAddress,
		seatLabel: ticket.seat.label,
		checkedInAt: ticket.checkedInAt,
		cancelledAt: ticket.cancelledAt,
		cancellationReason: ticket.cancellationReason,
		status: ticketStatus(ticket, ticket.event),
		code,
	};
}
