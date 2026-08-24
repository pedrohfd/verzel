import { describe, expect, it } from "vitest";
import { matchesMovieSearch } from "./search-movie-title";

describe("matchesMovieSearch", () => {
	it("matches case-insensitively", () => {
		expect(matchesMovieSearch("Some Movie", "SOME")).toBe(true);
	});

	it("matches regardless of accents", () => {
		expect(matchesMovieSearch("Coração Valente", "coracao")).toBe(true);
	});

	it("matches regardless of word order", () => {
		expect(matchesMovieSearch("The Matrix Reloaded", "reloaded matrix")).toBe(
			true,
		);
	});

	it("requires every token to be present", () => {
		expect(
			matchesMovieSearch("The Matrix Reloaded", "matrix revolutions"),
		).toBe(false);
	});

	it("returns false when there is no match", () => {
		expect(matchesMovieSearch("Some Movie", "nomatch")).toBe(false);
	});

	it("returns true for an empty or blank search", () => {
		expect(matchesMovieSearch("Some Movie", "")).toBe(true);
		expect(matchesMovieSearch("Some Movie", "   ")).toBe(true);
	});
});
