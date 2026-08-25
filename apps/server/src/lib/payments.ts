import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq, inArray } from "drizzle-orm";

import {
	HoldExpiredError,
	NotFoundError,
	ReservationNotHoldingError,
} from "./errors";
import { generateShareToken, signTicket } from "./ticket-code";

type SimulateOutcome = "approve" | "decline";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ComboItemInput {
	comboId: string;
	quantity: number;
}

interface ComboLine {
	comboId: string;
	name: string;
	unitPriceCents: number;
	quantity: number;
}

async function resolveComboLines(
	tx: Transaction,
	comboItems: ComboItemInput[],
	organizerId: string,
): Promise<ComboLine[]> {
	if (comboItems.length === 0) return [];

	const comboIds = comboItems.map((item) => item.comboId);
	const foundCombos = await tx.query.combos.findMany({
		where: inArray(schema.combos.id, comboIds),
	});

	return comboItems.map((item) => {
		const combo = foundCombos.find((c) => c.id === item.comboId);
		if (!combo || combo.organizerId !== organizerId) {
			throw new NotFoundError("Combo");
		}
		return {
			comboId: combo.id,
			name: combo.name,
			unitPriceCents: combo.priceCents,
			quantity: item.quantity,
		};
	});
}

function sumComboLines(comboLines: ComboLine[]) {
	return comboLines.reduce(
		(sum, line) => sum + line.unitPriceCents * line.quantity,
		0,
	);
}

async function insertComboItems(
	tx: Transaction,
	paymentId: string,
	comboLines: ComboLine[],
) {
	if (comboLines.length === 0) return;
	await tx.insert(schema.paymentComboItems).values(
		comboLines.map((line) => ({
			paymentId,
			comboId: line.comboId,
			comboName: line.name,
			unitPriceCents: line.unitPriceCents,
			quantity: line.quantity,
		})),
	);
}

async function issueTicket(
	tx: Transaction,
	reservation: { id: string; eventId: string; seatId: string },
) {
	const issuedAt = Date.now();
	const [ticketRow] = await tx
		.insert(schema.tickets)
		.values({
			reservationId: reservation.id,
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

	return { ...ticket, code };
}

async function loadPayableReservation(
	tx: Transaction,
	reservationId: string,
	customerId: string,
	expectedEventId: string | undefined,
) {
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
	if (
		expectedEventId !== undefined &&
		expectedEventId !== reservation.eventId
	) {
		throw new ReservationNotHoldingError();
	}

	return reservation;
}

async function chargeReservation(
	tx: Transaction,
	reservation: { id: string; eventId: string; seatId: string },
	event: { priceCents: number },
	simulateOutcome: SimulateOutcome,
	extraAmountCents: number,
	comboLines: ComboLine[],
) {
	const [payment] = await tx
		.insert(schema.payments)
		.values({
			reservationId: reservation.id,
			amountCents: event.priceCents + extraAmountCents,
			method: "simulated_card",
			status: simulateOutcome === "approve" ? "approved" : "declined",
			processedAt: new Date(),
		})
		.returning();
	if (!payment) throw new NotFoundError("Payment");

	if (simulateOutcome === "approve") {
		await insertComboItems(tx, payment.id, comboLines);
		await tx
			.update(schema.reservations)
			.set({ status: "paid", holdExpiresAt: null })
			.where(eq(schema.reservations.id, reservation.id));
		return { payment, ticket: await issueTicket(tx, reservation) };
	}

	// Seat is freed automatically: "cancelled" falls outside the partial
	// unique index's ('holding','paid') condition on reservations.seat_id.
	await tx
		.update(schema.reservations)
		.set({ status: "cancelled" })
		.where(eq(schema.reservations.id, reservation.id));
	return { payment, ticket: null };
}

export async function processPayment(
	reservationIds: string[],
	customerId: string,
	simulateOutcome: SimulateOutcome,
	comboItems: ComboItemInput[] = [],
) {
	return db.transaction(async (tx) => {
		const payments = [];
		const tickets = [];
		let eventId: string | undefined;

		for (const [index, reservationId] of reservationIds.entries()) {
			const reservation = await loadPayableReservation(
				tx,
				reservationId,
				customerId,
				eventId,
			);
			eventId = reservation.eventId;

			const event = await tx.query.events.findFirst({
				where: eq(schema.events.id, reservation.eventId),
			});
			if (!event) throw new NotFoundError("Event");

			const isFirstPayment = index === 0;
			const comboLines = isFirstPayment
				? await resolveComboLines(tx, comboItems, event.organizerId)
				: [];

			const { payment, ticket } = await chargeReservation(
				tx,
				reservation,
				event,
				simulateOutcome,
				sumComboLines(comboLines),
				comboLines,
			);
			payments.push(payment);
			if (ticket) tickets.push(ticket);
		}

		return { payments, tickets };
	});
}
