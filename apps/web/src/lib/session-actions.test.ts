import { describe, expect, it } from "vitest";

import { canCancelSession } from "./session-actions";

const now = new Date("2030-01-01T20:00:00Z");

describe("canCancelSession", () => {
	it("allows cancelling a draft or published session before it starts", () => {
		const sessionAt = "2030-01-01T20:01:00Z";

		expect(canCancelSession({ status: "draft", sessionAt }, now)).toBe(true);
		expect(canCancelSession({ status: "published", sessionAt }, now)).toBe(
			true,
		);
	});

	it("does not allow cancelling from the start of the session", () => {
		expect(
			canCancelSession(
				{ status: "published", sessionAt: "2030-01-01T20:00:00Z" },
				now,
			),
		).toBe(false);
	});

	it("does not allow cancelling a session that is already cancelled", () => {
		expect(
			canCancelSession(
				{ status: "cancelled", sessionAt: "2030-01-01T21:00:00Z" },
				now,
			),
		).toBe(false);
	});
});
