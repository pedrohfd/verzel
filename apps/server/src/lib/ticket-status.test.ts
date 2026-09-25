import { describe, expect, it } from "vitest";

import { ticketStatus } from "./ticket-status";

const sessionAt = new Date("2026-01-01T20:00:00.000Z");
const event = { sessionAt, durationMinutes: 120 };
const sessionEnd = new Date("2026-01-01T22:00:00.000Z");
const unused = { checkedInAt: null, cancelledAt: null };

describe("ticketStatus", () => {
	it("is valid before the session ends", () => {
		const oneMsBeforeEnd = new Date(sessionEnd.getTime() - 1);

		expect(ticketStatus(unused, event, oneMsBeforeEnd)).toBe("valid");
	});

	it("is expired exactly when the session ends", () => {
		expect(ticketStatus(unused, event, sessionEnd)).toBe("expired");
	});

	it("is expired after the session ends", () => {
		const later = new Date(sessionEnd.getTime() + 60_000);

		expect(ticketStatus(unused, event, later)).toBe("expired");
	});

	it("stays used after the session ends", () => {
		const ticket = { checkedInAt: sessionAt, cancelledAt: null };

		expect(ticketStatus(ticket, event, sessionEnd)).toBe("used");
	});

	it("stays cancelled after the session ends", () => {
		const ticket = { checkedInAt: null, cancelledAt: sessionAt };

		expect(ticketStatus(ticket, event, sessionEnd)).toBe("cancelled");
	});

	it("defaults to the current time", () => {
		const past = {
			sessionAt: new Date(Date.now() - 3 * 60 * 60_000),
			durationMinutes: 60,
		};

		expect(ticketStatus(unused, past)).toBe("expired");
	});
});
