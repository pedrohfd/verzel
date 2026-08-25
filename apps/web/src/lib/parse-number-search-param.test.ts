import { describe, expect, it } from "vitest";

import { parseNumberSearchParam } from "./parse-number-search-param";

describe("parseNumberSearchParam", () => {
	it("returns the value unchanged when it is already a number", () => {
		expect(parseNumberSearchParam(42)).toBe(42);
	});

	it("parses a numeric string", () => {
		expect(parseNumberSearchParam("42")).toBe(42);
	});

	it("returns undefined for an empty string", () => {
		expect(parseNumberSearchParam("")).toBeUndefined();
	});

	it("returns undefined for undefined", () => {
		expect(parseNumberSearchParam(undefined)).toBeUndefined();
	});

	it("returns undefined for non-numeric values", () => {
		expect(parseNumberSearchParam(true)).toBeUndefined();
		expect(parseNumberSearchParam({})).toBeUndefined();
	});
});
