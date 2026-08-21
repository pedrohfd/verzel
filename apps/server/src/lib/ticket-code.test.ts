import { describe, expect, it } from "vitest";

import {
	generateShareToken,
	signTicket,
	verifyTicketCode,
} from "./ticket-code";

describe("signTicket", () => {
	it("produces a code that verifyTicketCode can round-trip", () => {
		const payload = {
			ticketId: "ticket-1",
			eventId: "event-1",
			issuedAt: 1000,
		};

		const { code } = signTicket(payload);
		const verified = verifyTicketCode(code);

		expect(verified).toEqual(payload);
	});
});

describe("verifyTicketCode", () => {
	it("returns null for a code with the wrong number of parts", () => {
		expect(verifyTicketCode("only.two.parts")).toBeNull();
	});

	it("returns null when a segment is empty", () => {
		expect(verifyTicketCode("..1000.signature")).toBeNull();
	});

	it("returns null when issuedAt is not a finite number", () => {
		const { code } = signTicket({
			ticketId: "t1",
			eventId: "e1",
			issuedAt: 1000,
		});
		const tampered = code.replace(".1000.", ".not-a-number.");

		expect(verifyTicketCode(tampered)).toBeNull();
	});

	it("returns null when the signature does not match", () => {
		const { code } = signTicket({
			ticketId: "t1",
			eventId: "e1",
			issuedAt: 1000,
		});
		const [ticketId, eventId, issuedAt] = code.split(".");

		expect(
			verifyTicketCode(`${ticketId}.${eventId}.${issuedAt}.wrong-signature`),
		).toBeNull();
	});

	it("returns null when the tampered payload changes the signature length", () => {
		const { code } = signTicket({
			ticketId: "t1",
			eventId: "e1",
			issuedAt: 1000,
		});
		const tampered = code.replace("t1", "tampered-ticket-id");

		expect(verifyTicketCode(tampered)).toBeNull();
	});
});

describe("generateShareToken", () => {
	it("generates non-empty, unique tokens", () => {
		const a = generateShareToken();
		const b = generateShareToken();

		expect(a).not.toBe(b);
		expect(a.length).toBeGreaterThan(0);
	});
});
