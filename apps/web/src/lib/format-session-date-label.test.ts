import { describe, expect, it } from "vitest";

import { formatSessionDateLabel, isSameDay } from "./format-session-date-label";

describe("isSameDay", () => {
	it("returns true for the same calendar day at different times", () => {
		expect(
			isSameDay(
				new Date("2026-08-19T08:00:00"),
				new Date("2026-08-19T23:30:00"),
			),
		).toBe(true);
	});

	it("returns false for different calendar days", () => {
		expect(
			isSameDay(
				new Date("2026-08-19T23:59:59"),
				new Date("2026-08-20T00:00:00"),
			),
		).toBe(false);
	});
});

describe("formatSessionDateLabel", () => {
	const now = new Date("2026-08-19T10:00:00");

	it("labels today as HOJE", () => {
		expect(
			formatSessionDateLabel(new Date("2026-08-19T20:00:00"), now),
		).toEqual({
			weekday: "HOJE",
			date: "19/08",
		});
	});

	it("labels tomorrow as AMANHÃ", () => {
		expect(
			formatSessionDateLabel(new Date("2026-08-20T20:00:00"), now),
		).toEqual({
			weekday: "AMANHÃ",
			date: "20/08",
		});
	});

	it("labels other days with the weekday abbreviation", () => {
		expect(
			formatSessionDateLabel(new Date("2026-08-22T20:00:00"), now),
		).toEqual({
			weekday: "SÁB",
			date: "22/08",
		});
	});
});
