import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";

import {
	HoldExpiredError,
	NotFoundError,
	ReservationLimitExceededError,
	SeatAlreadyReservedError,
} from "./errors";
import { MAX_TICKETS_PER_PURCHASE } from "./purchases";
import { seatLabel } from "./seat-label";

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

type Executor = Pick<typeof db, "select">;

export async function countActiveHolds(
	eventId: string,
	customerId: string,
	executor: Executor = db,
) {
	const [active] = await executor
		.select({ total: count() })
		.from(schema.reservations)
		.where(
			and(
				eq(schema.reservations.customerId, customerId),
				eq(schema.reservations.eventId, eventId),
				eq(schema.reservations.status, "holding"),
				gte(schema.reservations.holdExpiresAt, new Date()),
			),
		);
	return active?.total ?? 0;
}

export async function createHolds(
	eventId: string,
	seats: { row: number; column: number }[],
	customerId: string,
) {
	return db.transaction(async (tx) => {
		const [event] = await tx
			.select()
			.from(schema.events)
			.where(eq(schema.events.id, eventId))
			.for("share");
		if (event?.status !== "published") {
			throw new NotFoundError("Event");
		}

		// Serializes concurrent requests of the same customer for the same
		// session, so both cannot pass the limit check before either inserts.
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${`${customerId}:${eventId}`}, 0))`,
		);
		const active = await countActiveHolds(eventId, customerId, tx);
		if (active + seats.length > MAX_TICKETS_PER_PURCHASE) {
			throw new ReservationLimitExceededError(MAX_TICKETS_PER_PURCHASE);
		}

		const reservations = [];
		for (const { row, column } of seats) {
			if (
				row < 0 ||
				row >= event.rows ||
				column < 0 ||
				column >= event.columns
			) {
				throw new NotFoundError("Seat");
			}

			const [insertedSeat] = await tx
				.insert(schema.seats)
				.values({ eventId, row, column, label: seatLabel(row, column) })
				.onConflictDoNothing({
					target: [schema.seats.eventId, schema.seats.row, schema.seats.column],
				})
				.returning();

			const seat =
				insertedSeat ??
				(await tx.query.seats.findFirst({
					where: and(
						eq(schema.seats.eventId, eventId),
						eq(schema.seats.row, row),
						eq(schema.seats.column, column),
					),
				}));
			if (!seat) throw new NotFoundError("Seat");

			// Free up any stale hold on this seat before attempting the insert, so
			// the unique index below only ever blocks genuinely-live reservations.
			await tx
				.update(schema.reservations)
				.set({ status: "expired" })
				.where(
					and(
						eq(schema.reservations.seatId, seat.id),
						eq(schema.reservations.status, "holding"),
						lt(schema.reservations.holdExpiresAt, new Date()),
					),
				);

			try {
				const [reservation] = await tx
					.insert(schema.reservations)
					.values({
						eventId,
						seatId: seat.id,
						customerId,
						status: "holding",
						holdExpiresAt: new Date(Date.now() + HOLD_TTL_MINUTES * 60_000),
					})
					.returning();

				reservations.push(reservation);
			} catch (error) {
				if (isUniqueViolation(error))
					throw new SeatAlreadyReservedError(seat.id);
				throw error;
			}
		}

		return reservations;
	});
}

export async function cancelHolds(
	reservationIds: string[],
	customerId: string,
) {
	await db
		.update(schema.reservations)
		.set({ status: "cancelled" })
		.where(
			and(
				inArray(schema.reservations.id, reservationIds),
				eq(schema.reservations.customerId, customerId),
				eq(schema.reservations.status, "holding"),
			),
		);
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
		with: { seat: true },
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
