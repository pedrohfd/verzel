import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import { verifyTicketCode } from "./ticket-code";

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
