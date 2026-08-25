import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";

import { verifyTicketCode } from "./ticket-code";

export interface ListCheckinEventsFilters {
	date?: string;
}

export function listCheckinEvents(filters: ListCheckinEventsFilters = {}) {
	const { date } = filters;
	const from = date
		? new Date(`${date}T00:00:00`)
		: new Date(Date.now() - 24 * 60 * 60_000);
	const to = date
		? new Date(new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60_000)
		: undefined;

	return db.query.events.findMany({
		where: and(
			eq(schema.events.status, "published"),
			gte(schema.events.sessionAt, from),
			to ? lt(schema.events.sessionAt, to) : undefined,
		),
		orderBy: asc(schema.events.sessionAt),
	});
}

export type CheckinResult =
	| {
			result: "valid";
			seatLabel: string;
			movieTitle: string;
			customerName: string;
	  }
	| { result: "invalid" }
	| { result: "already_used"; checkedInAt: string; checkedInBy: string | null }
	| { result: "wrong_event"; ticketEventId: string }
	| { result: "cancelled"; cancelledAt: string };

export async function validateTicket(
	eventId: string,
	code: string,
	checkedInByUserId: string,
): Promise<CheckinResult> {
	const parsed = verifyTicketCode(code);
	if (!parsed) return { result: "invalid" };

	return db.transaction(async (tx) => {
		const [ticket] = await tx
			.select()
			.from(schema.tickets)
			.where(eq(schema.tickets.id, parsed.ticketId))
			.for("update");

		if (!ticket) return { result: "invalid" };
		if (ticket.eventId !== eventId || parsed.eventId !== eventId) {
			return { result: "wrong_event", ticketEventId: ticket.eventId };
		}

		if (ticket.cancelledAt) {
			return {
				result: "cancelled",
				cancelledAt: ticket.cancelledAt.toISOString(),
			};
		}

		if (ticket.checkedInAt) {
			return {
				result: "already_used",
				checkedInAt: ticket.checkedInAt.toISOString(),
				checkedInBy: ticket.checkedInByUserId,
			};
		}

		const [updated] = await tx
			.update(schema.tickets)
			.set({ checkedInAt: new Date(), checkedInByUserId })
			.where(
				and(
					eq(schema.tickets.id, ticket.id),
					isNull(schema.tickets.checkedInAt),
				),
			)
			.returning();

		if (!updated) {
			// Lost the race between our SELECT and UPDATE to a concurrent scan.
			return {
				result: "already_used",
				checkedInAt: new Date().toISOString(),
				checkedInBy: null,
			};
		}

		const seat = await tx.query.seats.findFirst({
			where: eq(schema.seats.id, ticket.seatId),
		});
		const event = await tx.query.events.findFirst({
			where: eq(schema.events.id, ticket.eventId),
		});
		const reservation = await tx.query.reservations.findFirst({
			where: eq(schema.reservations.id, ticket.reservationId),
			with: { customer: true },
		});

		return {
			result: "valid",
			seatLabel: seat?.label ?? "",
			movieTitle: event?.movieTitle ?? "",
			customerName: reservation?.customer.name ?? "",
		};
	});
}
