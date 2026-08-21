import { describe, expect, it } from "vitest";

import { tmdbImageUrl } from "./tmdb-image";

describe("tmdbImageUrl", () => {
	it("builds a w342 image url", () => {
		expect(tmdbImageUrl("/poster.jpg", "w342")).toBe(
			"https://image.tmdb.org/t/p/w342/poster.jpg",
		);
	});

	it("builds a w1280 image url", () => {
		expect(tmdbImageUrl("/backdrop.jpg", "w1280")).toBe(
			"https://image.tmdb.org/t/p/w1280/backdrop.jpg",
		);
	});
});
