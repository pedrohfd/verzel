import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";

import {
	HoldExpiredError,
	NotFoundError,
	ReservationNotHoldingError,
} from "./errors";
import { generateShareToken, signTicket } from "./ticket-code";

type SimulateOutcome = "approve" | "decline";

export async function processPayment(
	reservationIds: string[],
	customerId: string,
	simulateOutcome: SimulateOutcome,
) {
	return db.transaction(async (tx) => {
		const payments = [];
		const tickets = [];
		let eventId: string | undefined;

		for (const reservationId of reservationIds) {
			const [reservation] = await tx
				.select()
				.from(schema.reservations)
				.where(eq(schema.reservations.id, reservationId))
				.for("update");

			if (!reservation || reservation.customerId !== customerId) {
				throw new NotFoundError("Reservation");
			}
			if (reservation.status !== "holding") {
				throw new ReservationNotHoldingError();
			}
			if (reservation.holdExpiresAt && reservation.holdExpiresAt < new Date()) {
				throw new HoldExpiredError();
			}
			if (eventId === undefined) {
				eventId = reservation.eventId;
			} else if (eventId !== reservation.eventId) {
				throw new ReservationNotHoldingError();
			}

			const event = await tx.query.events.findFirst({
				where: eq(schema.events.id, reservation.eventId),
			});
			if (!event) throw new NotFoundError("Event");

			const [payment] = await tx
				.insert(schema.payments)
				.values({
					reservationId,
					amountCents: event.priceCents,
					method: "simulated_card",
					status: simulateOutcome === "approve" ? "approved" : "declined",
					processedAt: new Date(),
				})
				.returning();
			payments.push(payment);

			if (simulateOutcome === "approve") {
				await tx
					.update(schema.reservations)
					.set({ status: "paid", holdExpiresAt: null })
					.where(eq(schema.reservations.id, reservationId));

				const issuedAt = Date.now();
				const [ticketRow] = await tx
					.insert(schema.tickets)
					.values({
						reservationId,
						eventId: reservation.eventId,
						seatId: reservation.seatId,
						shareToken: generateShareToken(),
						signature: "",
						issuedAt: new Date(issuedAt),
					})
					.returning();

				if (!ticketRow) throw new NotFoundError("Ticket");

				const { code, signature } = signTicket({
					ticketId: ticketRow.id,
					eventId: reservation.eventId,
					issuedAt,
				});

				const [ticket] = await tx
					.update(schema.tickets)
					.set({ signature })
					.where(eq(schema.tickets.id, ticketRow.id))
					.returning();

				tickets.push({ ...ticket, code });
			} else {
				// Seat is freed automatically: "cancelled" falls outside the partial
				// unique index's ('holding','paid') condition on reservations.seat_id.
				await tx
					.update(schema.reservations)
					.set({ status: "cancelled" })
					.where(eq(schema.reservations.id, reservationId));
			}
		}

		return { payments, tickets };
	});
}
