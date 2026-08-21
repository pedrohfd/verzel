import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, eq, lt } from "drizzle-orm";

import {
	HoldExpiredError,
	NotFoundError,
	SeatAlreadyReservedError,
} from "./errors";

const HOLD_TTL_MINUTES = 10;

function pgErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	if ("code" in error && typeof error.code === "string") return error.code;
	if ("cause" in error) return pgErrorCode(error.cause);
	return undefined;
}

function isUniqueViolation(error: unknown): boolean {
	return pgErrorCode(error) === "23505";
}

export async function createHold(
	eventId: string,
	seatId: string,
	customerId: string,
) {
	return db.transaction(async (tx) => {
		const seat = await tx.query.seats.findFirst({
			where: and(
				eq(schema.seats.id, seatId),
				eq(schema.seats.eventId, eventId),
			),
		});
		if (!seat) throw new NotFoundError("Seat");

		// Free up any stale hold on this seat before attempting the insert, so
		// the unique index below only ever blocks genuinely-live reservations.
		await tx
			.update(schema.reservations)
			.set({ status: "expired" })
			.where(
				and(
					eq(schema.reservations.seatId, seatId),
					eq(schema.reservations.status, "holding"),
					lt(schema.reservations.holdExpiresAt, new Date()),
				),
			);

		try {
			const [reservation] = await tx
				.insert(schema.reservations)
				.values({
					eventId,
					seatId,
					customerId,
					status: "holding",
					holdExpiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60_000),
				})
				.returning();

			return reservation;
		} catch (error) {
			if (isUniqueViolation(error)) throw new SeatAlreadyReservedError(seatId);
			throw error;
		}
	});
}

export async function getOwnedReservation(
	reservationId: string,
	customerId: string,
) {
	const reservation = await db.query.reservations.findFirst({
		where: and(
			eq(schema.reservations.id, reservationId),
			eq(schema.reservations.customerId, customerId),
		),
	});
	if (!reservation) throw new NotFoundError("Reservation");
	if (
		reservation.status === "holding" &&
		reservation.holdExpiresAt &&
		reservation.holdExpiresAt < new Date()
	) {
		throw new HoldExpiredError();
	}
	return reservation;
}
