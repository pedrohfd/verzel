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
