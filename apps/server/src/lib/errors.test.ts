import { describe, expect, it, vi } from "vitest";

import {
	DomainError,
	ForbiddenError,
	HoldExpiredError,
	NotFoundError,
	ReservationNotHoldingError,
	SeatAlreadyReservedError,
	sendDomainError,
} from "./errors";

function createMockReply() {
	const reply = {
		status: vi.fn(),
		send: vi.fn(),
		log: { error: vi.fn() },
	};
	reply.status.mockReturnValue(reply);
	reply.send.mockReturnValue(reply);
	return reply as unknown as import("fastify").FastifyReply & {
		status: ReturnType<typeof vi.fn>;
		send: ReturnType<typeof vi.fn>;
		log: { error: ReturnType<typeof vi.fn> };
	};
}

describe("sendDomainError", () => {
	it("responds with the domain error's status and code", () => {
		const reply = createMockReply();
		const error = new SeatAlreadyReservedError("seat-1");

		sendDomainError(reply, error, "fallback message");

		expect(reply.status).toHaveBeenCalledWith(409);
		expect(reply.send).toHaveBeenCalledWith({
			error: "Seat seat-1 is already reserved",
			code: "SEAT_ALREADY_RESERVED",
		});
	});

	it("responds with 500 and logs when the error is not a DomainError", () => {
		const reply = createMockReply();
		const error = new Error("boom");

		sendDomainError(reply, error, "fallback message");

		expect(reply.log.error).toHaveBeenCalledWith(
			{ err: error },
			"fallback message",
		);
		expect(reply.status).toHaveBeenCalledWith(500);
		expect(reply.send).toHaveBeenCalledWith({
			error: "fallback message",
			code: "INTERNAL_ERROR",
		});
	});
});

describe("domain error subclasses", () => {
	it("ReservationNotHoldingError has status 409 and its code", () => {
		const error = new ReservationNotHoldingError();
		expect(error.status).toBe(409);
		expect(error.code).toBe("RESERVATION_NOT_HOLDING");
	});

	it("HoldExpiredError has status 409 and its code", () => {
		const error = new HoldExpiredError();
		expect(error.status).toBe(409);
		expect(error.code).toBe("HOLD_EXPIRED");
	});

	it("NotFoundError formats the message with what was not found", () => {
		const error = new NotFoundError("Event");
		expect(error.message).toBe("Event not found");
		expect(error.status).toBe(404);
		expect(error.code).toBe("NOT_FOUND");
	});

	it("ForbiddenError defaults its message when none is given", () => {
		const error = new ForbiddenError();
		expect(error.message).toBe("You do not have access to this resource");
		expect(error.status).toBe(403);
		expect(error.code).toBe("FORBIDDEN");
	});

	it("ForbiddenError accepts a custom message", () => {
		const error = new ForbiddenError("custom message");
		expect(error.message).toBe("custom message");
	});

	it("all domain errors are instances of DomainError", () => {
		expect(new NotFoundError("x")).toBeInstanceOf(DomainError);
	});
});
