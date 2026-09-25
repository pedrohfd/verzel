import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq, inArray } from "drizzle-orm";

import {
	HoldExpiredError,
	MixedSessionsError,
	NotFoundError,
	ReservationNotHoldingError,
	TicketLimitExceededError,
} from "./errors";
import { generateShareToken, signTicket } from "./ticket-code";

export const MAX_TICKETS_PER_PURCHASE = 10;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reservation = typeof schema.reservations.$inferSelect;

export interface ComboItemInput {
	comboId: string;
	quantity: number;
}

export interface CheckoutInput {
	reservationIds: string[];
	customerId: string;
	outcome: "approve" | "decline";
	comboItems?: ComboItemInput[];
}

async function lockPayableReservations(
	tx: Transaction,
	reservationIds: string[],
	customerId: string,
) {
	const rows = await tx
		.select()
		.from(schema.reservations)
		.where(inArray(schema.reservations.id, reservationIds))
		.for("update");

	const now = new Date();
	const reservations = reservationIds.map((id) => {
		const reservation = rows.find((row) => row.id === id);
		if (!reservation || reservation.customerId !== customerId) {
			throw new NotFoundError("Reservation");
		}
		if (reservation.status !== "holding") {
			throw new ReservationNotHoldingError();
		}
		if (reservation.holdExpiresAt && reservation.holdExpiresAt < now) {
			throw new HoldExpiredError();
		}
		return reservation;
	});

	const eventIds = new Set(reservations.map((r) => r.eventId));
	if (eventIds.size > 1) throw new MixedSessionsError();

	return reservations;
}

async function resolveComboLines(
	tx: Transaction,
	comboItems: ComboItemInput[],
	organizerId: string,
) {
	if (comboItems.length === 0) return [];

	const foundCombos = await tx.query.combos.findMany({
		where: inArray(
			schema.combos.id,
			comboItems.map((item) => item.comboId),
		),
	});

	return comboItems.map((item) => {
		const combo = foundCombos.find((c) => c.id === item.comboId);
		if (!combo || combo.organizerId !== organizerId) {
			throw new NotFoundError("Combo");
		}
		return {
			comboId: combo.id,
			comboName: combo.name,
			unitPriceCents: combo.priceCents,
			quantity: item.quantity,
		};
	});
}

async function issueTicket(
	tx: Transaction,
	reservation: Reservation,
	purchaseId: string,
	priceCents: number,
) {
	const issuedAt = Date.now();
	const [row] = await tx
		.insert(schema.tickets)
		.values({
			reservationId: reservation.id,
			eventId: reservation.eventId,
			seatId: reservation.seatId,
			purchaseId,
			priceCents,
			shareToken: generateShareToken(),
			signature: "",
			issuedAt: new Date(issuedAt),
		})
		.returning();
	if (!row) throw new NotFoundError("Ticket");

	const { code, signature } = signTicket({
		ticketId: row.id,
		eventId: reservation.eventId,
		issuedAt,
	});

	const [ticket] = await tx
		.update(schema.tickets)
		.set({ signature })
		.where(eq(schema.tickets.id, row.id))
		.returning();
	if (!ticket) throw new NotFoundError("Ticket");

	return { ...ticket, code };
}

export async function checkout({
	reservationIds,
	customerId,
	outcome,
	comboItems = [],
}: CheckoutInput) {
	if (
		reservationIds.length === 0 ||
		reservationIds.length > MAX_TICKETS_PER_PURCHASE
	) {
		throw new TicketLimitExceededError(MAX_TICKETS_PER_PURCHASE);
	}

	return db.transaction(async (tx) => {
		const reservations = await lockPayableReservations(
			tx,
			reservationIds,
			customerId,
		);
		const eventId = reservations[0]?.eventId ?? "";
		const event = await tx.query.events.findFirst({
			where: eq(schema.events.id, eventId),
		});
		if (!event) throw new NotFoundError("Event");

		const comboLines = await resolveComboLines(
			tx,
			comboItems,
			event.organizerId,
		);

		if (outcome === "decline") {
			// Seats are freed: "cancelled" falls outside the partial unique index's
			// ('holding','paid') condition on reservations.seat_id.
			await tx
				.update(schema.reservations)
				.set({ status: "cancelled" })
				.where(inArray(schema.reservations.id, reservationIds));
			return { purchase: null, tickets: [] };
		}

		const combosCents = comboLines.reduce(
			(sum, line) => sum + line.unitPriceCents * line.quantity,
			0,
		);
		const [purchase] = await tx
			.insert(schema.purchases)
			.values({
				customerId,
				eventId,
				amountCents: event.priceCents * reservations.length + combosCents,
				method: "simulated_card",
				processedAt: new Date(),
			})
			.returning();
		if (!purchase) throw new NotFoundError("Purchase");

		if (comboLines.length > 0) {
			await tx
				.insert(schema.purchaseComboItems)
				.values(
					comboLines.map((line) => ({ ...line, purchaseId: purchase.id })),
				);
		}

		await tx
			.update(schema.reservations)
			.set({ status: "paid", holdExpiresAt: null })
			.where(inArray(schema.reservations.id, reservationIds));

		const tickets = [];
		for (const reservation of reservations) {
			tickets.push(
				await issueTicket(tx, reservation, purchase.id, event.priceCents),
			);
		}

		return { purchase, tickets };
	});
}
