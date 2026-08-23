import { describe, expect, it } from "vitest";

import { dedupeEventsByMovie } from "./dedupe-events-by-movie";

const asEvents = (entries: Array<{ id: string; tmdbMovieId: number }>) =>
	entries as import("@/api/types").VerzelEvent[];

describe("dedupeEventsByMovie", () => {
	it("keeps only the first event per tmdbMovieId", () => {
		const events = asEvents([
			{ id: "event-1", tmdbMovieId: 1 },
			{ id: "event-2", tmdbMovieId: 1 },
			{ id: "event-3", tmdbMovieId: 2 },
		]);

		expect(dedupeEventsByMovie(events)).toEqual([events[0], events[2]]);
	});

	it("returns an empty array when given no events", () => {
		expect(dedupeEventsByMovie([])).toEqual([]);
	});
});
