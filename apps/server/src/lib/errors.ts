export class DomainError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code: string,
	) {
		super(message);
		this.name = "DomainError";
	}
}

export class SeatAlreadyReservedError extends DomainError {
	constructor(seatId: string) {
		super(`Seat ${seatId} is already reserved`, 409, "SEAT_ALREADY_RESERVED");
	}
}

export class ReservationNotHoldingError extends DomainError {
	constructor() {
		super(
			"Reservation is not in a payable state",
			409,
			"RESERVATION_NOT_HOLDING",
		);
	}
}

export class HoldExpiredError extends DomainError {
	constructor() {
		super("Reservation hold has expired", 409, "HOLD_EXPIRED");
	}
}

export class NotFoundError extends DomainError {
	constructor(what: string) {
		super(`${what} not found`, 404, "NOT_FOUND");
	}
}

export class ForbiddenError extends DomainError {
	constructor(message = "You do not have access to this resource") {
		super(message, 403, "FORBIDDEN");
	}
}

export class CinemaNotRegisteredError extends DomainError {
	constructor() {
		super("Organizer has no cinema registered", 400, "CINEMA_NOT_REGISTERED");
	}
}

export class EventNotEditableError extends DomainError {
	constructor() {
		super("Cancelled events cannot be edited", 409, "EVENT_NOT_EDITABLE");
	}
}

export class EventSeatsLockedError extends DomainError {
	constructor() {
		super(
			"Seat layout cannot be changed after publishing",
			409,
			"EVENT_SEATS_LOCKED",
		);
	}
}

export class RoomInUseError extends DomainError {
	constructor() {
		super("Room is in use by an active event", 409, "ROOM_IN_USE");
	}
}

export function sendDomainError(
	reply: import("fastify").FastifyReply,
	error: unknown,
	fallbackMessage: string,
) {
	if (error instanceof DomainError) {
		return reply
			.status(error.status)
			.send({ error: error.message, code: error.code });
	}

	reply.log.error({ err: error }, fallbackMessage);
	return reply
		.status(500)
		.send({ error: fallbackMessage, code: "INTERNAL_ERROR" });
}
