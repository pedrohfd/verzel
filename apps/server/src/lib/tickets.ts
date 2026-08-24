import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";

import {
	EventAlreadyStartedError,
	ForbiddenError,
	NotFoundError,
	TicketAlreadyCancelledError,
	TicketAlreadyCheckedInError,
} from "./errors";
import { signTicket } from "./ticket-code";

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

	return { ...ticket, code };
}

export async function cancelTicket(ticketId: string, customerId: string) {
	return db.transaction(async (tx) => {
		const [ticket] = await tx
			.select()
			.from(schema.tickets)
			.where(eq(schema.tickets.id, ticketId))
			.for("update");
		if (!ticket) throw new NotFoundError("Ticket");

		const reservation = await tx.query.reservations.findFirst({
			where: eq(schema.reservations.id, ticket.reservationId),
		});
		if (!reservation || reservation.customerId !== customerId) {
			throw new ForbiddenError();
		}
		if (ticket.cancelledAt) throw new TicketAlreadyCancelledError();
		if (ticket.checkedInAt) throw new TicketAlreadyCheckedInError();

		const event = await tx.query.events.findFirst({
			where: eq(schema.events.id, ticket.eventId),
		});
		if (!event) throw new NotFoundError("Event");
		if (event.sessionAt <= new Date()) throw new EventAlreadyStartedError();

		const [updatedTicket] = await tx
			.update(schema.tickets)
			.set({ cancelledAt: new Date() })
			.where(eq(schema.tickets.id, ticketId))
			.returning();

		// Frees the seat: cancelled reservations fall outside the partial unique
		// index's ('holding','paid') condition, same mechanism as processPayment's
		// decline branch.
		await tx
			.update(schema.reservations)
			.set({ status: "cancelled" })
			.where(eq(schema.reservations.id, ticket.reservationId));

		return updatedTicket;
	});
}

export async function listMyTickets(customerId: string) {
	const reservations = await db.query.reservations.findMany({
		where: eq(schema.reservations.customerId, customerId),
		with: { ticket: true, event: true, seat: true },
	});
	return reservations.filter((r) => r.ticket !== null);
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
		code,
	};
}
