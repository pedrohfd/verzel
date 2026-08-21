import { describe, expect, it } from "vitest";

import { formatPriceCents } from "./format-price";

describe("formatPriceCents", () => {
	it("formats cents as BRL currency", () => {
		expect(formatPriceCents(1000)).toBe(
			(10).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
		);
	});

	it("formats zero as BRL currency", () => {
		expect(formatPriceCents(0)).toBe(
			(0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
		);
	});

	it("rounds fractional cents down to whole currency units correctly", () => {
		expect(formatPriceCents(1050)).toBe(
			(10.5).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
		);
	});
});
