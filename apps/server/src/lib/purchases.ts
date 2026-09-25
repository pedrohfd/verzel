import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

import {
	EventAlreadyStartedError,
	ForbiddenError,
	HoldExpiredError,
	InvalidEventTransitionError,
	MixedSessionsError,
	NotFoundError,
	ReservationNotHoldingError,
	TicketAlreadyCancelledError,
	TicketAlreadyCheckedInError,
	TicketLimitExceededError,
} from "./errors";
import { generateShareToken, signTicket } from "./ticket-code";
import { ticketStatus } from "./ticket-status";

export const MAX_TICKETS_PER_PURCHASE = 10;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reservation = typeof schema.reservations.$inferSelect;
type Ticket = typeof schema.tickets.$inferSelect;
type CancellationReason =
	(typeof schema.cancellationReasonEnum.enumValues)[number];

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
	reservationIds: requestedIds,
	customerId,
	outcome,
	comboItems = [],
}: CheckoutInput) {
	const reservationIds = [...new Set(requestedIds)];
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
		// Locked so a concurrent session cancellation cannot leave valid tickets
		// behind on a cancelled session.
		const [event] = await tx
			.select()
			.from(schema.events)
			.where(eq(schema.events.id, eventId))
			.for("update");
		if (event?.status !== "published") throw new NotFoundError("Event");

		const comboLines = await resolveComboLines(
			tx,
			comboItems,
			event.organizerId,
		);

		// A declined payment leaves the holds untouched: the customer may retry
		// until they expire, and the deadline is not renewed.
		if (outcome === "decline") return { purchase: null, tickets: [] };

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

async function combosTotalCents(tx: Transaction, purchaseId: string) {
	const items = await tx.query.purchaseComboItems.findMany({
		where: eq(schema.purchaseComboItems.purchaseId, purchaseId),
	});
	return items.reduce(
		(sum, item) => sum + item.unitPriceCents * item.quantity,
		0,
	);
}

async function lockPurchaseTickets(tx: Transaction, purchaseId: string) {
	return tx
		.select()
		.from(schema.tickets)
		.where(eq(schema.tickets.purchaseId, purchaseId))
		.for("update");
}

// Cancels the given tickets of one purchase, frees their seats and records a
// single refund for them. Combos are refunded together with the last ticket
// that is still active; a used ticket counts as active because its combos may
// already have been consumed, so they are refunded at most once per purchase.
async function cancelAndRefund(
	tx: Transaction,
	purchaseId: string,
	purchaseTickets: Ticket[],
	toCancel: Ticket[],
	reason: CancellationReason,
	refundTicketId: string | null,
) {
	const cancelledIds = new Set(toCancel.map((ticket) => ticket.id));

	await tx
		.update(schema.tickets)
		.set({ cancelledAt: new Date(), cancellationReason: reason })
		.where(inArray(schema.tickets.id, [...cancelledIds]));

	// Frees the seats: cancelled reservations fall outside the partial unique
	// index's ('holding','paid') condition.
	await tx
		.update(schema.reservations)
		.set({ status: "cancelled" })
		.where(
			inArray(
				schema.reservations.id,
				toCancel.map((ticket) => ticket.reservationId),
			),
		);

	const remainsActive = purchaseTickets.some(
		(ticket) => !ticket.cancelledAt && !cancelledIds.has(ticket.id),
	);
	const ticketsCents = toCancel.reduce(
		(sum, ticket) => sum + ticket.priceCents,
		0,
	);
	const combosCents = remainsActive
		? 0
		: await combosTotalCents(tx, purchaseId);

	const [refund] = await tx
		.insert(schema.refunds)
		.values({
			purchaseId,
			ticketId: refundTicketId,
			amountCents: ticketsCents + combosCents,
			reason,
		})
		.returning();
	if (!refund) throw new NotFoundError("Refund");
	return refund;
}

export async function cancelTicket(ticketId: string, customerId: string) {
	return db.transaction(async (tx) => {
		const target = await tx.query.tickets.findFirst({
			where: eq(schema.tickets.id, ticketId),
			columns: { purchaseId: true },
		});
		if (!target) throw new NotFoundError("Ticket");

		const [purchase] = await tx
			.select()
			.from(schema.purchases)
			.where(eq(schema.purchases.id, target.purchaseId))
			.for("update");
		if (!purchase || purchase.customerId !== customerId) {
			throw new ForbiddenError();
		}

		const purchaseTickets = await lockPurchaseTickets(tx, purchase.id);
		const ticket = purchaseTickets.find((t) => t.id === ticketId);
		if (!ticket) throw new NotFoundError("Ticket");
		if (ticket.cancelledAt) throw new TicketAlreadyCancelledError();
		if (ticket.checkedInAt) throw new TicketAlreadyCheckedInError();

		const event = await tx.query.events.findFirst({
			where: eq(schema.events.id, ticket.eventId),
		});
		if (!event) throw new NotFoundError("Event");
		if (event.sessionAt <= new Date()) throw new EventAlreadyStartedError();

		return cancelAndRefund(
			tx,
			purchase.id,
			purchaseTickets,
			[ticket],
			"customer_cancelled",
			ticket.id,
		);
	});
}

export async function cancelEvent(eventId: string, organizerId: string) {
	return db.transaction(async (tx) => {
		const [event] = await tx
			.select()
			.from(schema.events)
			.where(eq(schema.events.id, eventId))
			.for("update");
		if (!event) throw new NotFoundError("Event");
		if (event.organizerId !== organizerId) throw new ForbiddenError();
		if (event.status === "cancelled") {
			throw new InvalidEventTransitionError(event.status, "cancelled");
		}
		if (event.sessionAt <= new Date()) throw new EventAlreadyStartedError();

		const [cancelled] = await tx
			.update(schema.events)
			.set({ status: "cancelled" })
			.where(eq(schema.events.id, eventId))
			.returning();
		if (!cancelled) throw new NotFoundError("Event");

		const purchases = await tx
			.select()
			.from(schema.purchases)
			.where(eq(schema.purchases.eventId, eventId))
			.for("update");

		for (const purchase of purchases) {
			const purchaseTickets = await lockPurchaseTickets(tx, purchase.id);
			const toCancel = purchaseTickets.filter((ticket) => !ticket.cancelledAt);
			if (toCancel.length === 0) continue;

			await cancelAndRefund(
				tx,
				purchase.id,
				purchaseTickets,
				toCancel,
				"event_cancelled",
				null,
			);
		}

		return cancelled;
	});
}

export async function listMyPurchases(customerId: string) {
	const purchases = await db.query.purchases.findMany({
		where: eq(schema.purchases.customerId, customerId),
		with: {
			event: true,
			comboItems: true,
			refunds: true,
			tickets: { with: { seat: true } },
		},
		orderBy: desc(schema.purchases.createdAt),
	});

	return purchases.map(({ tickets, ...purchase }) => ({
		...purchase,
		refundedCents: purchase.refunds.reduce(
			(sum, refund) => sum + refund.amountCents,
			0,
		),
		tickets: tickets
			.sort((a, b) => a.seat.row - b.seat.row || a.seat.column - b.seat.column)
			.map((ticket) => ({
				...ticket,
				status: ticketStatus(ticket, purchase.event),
			})),
	}));
}
