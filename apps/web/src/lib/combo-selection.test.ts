import { describe, expect, it } from "vitest";

import {
	parseComboSelection,
	serializeComboSelection,
} from "./combo-selection";

describe("serializeComboSelection", () => {
	it("joins entries as comboId:quantity separated by commas", () => {
		expect(
			serializeComboSelection([
				{ comboId: "combo-1", quantity: 2 },
				{ comboId: "combo-2", quantity: 1 },
			]),
		).toBe("combo-1:2,combo-2:1");
	});

	it("drops entries with quantity 0", () => {
		expect(
			serializeComboSelection([
				{ comboId: "combo-1", quantity: 0 },
				{ comboId: "combo-2", quantity: 1 },
			]),
		).toBe("combo-2:1");
	});

	it("returns an empty string when there are no entries", () => {
		expect(serializeComboSelection([])).toBe("");
	});
});

describe("parseComboSelection", () => {
	it("parses a comma-separated comboId:quantity string", () => {
		expect(parseComboSelection("combo-1:2,combo-2:1")).toEqual([
			{ comboId: "combo-1", quantity: 2 },
			{ comboId: "combo-2", quantity: 1 },
		]);
	});

	it("returns an empty array for undefined input", () => {
		expect(parseComboSelection(undefined)).toEqual([]);
	});

	it("returns an empty array for an empty string", () => {
		expect(parseComboSelection("")).toEqual([]);
	});

	it("ignores malformed entries", () => {
		expect(parseComboSelection("combo-1:0,combo-2:abc,combo-3:1")).toEqual([
			{ comboId: "combo-3", quantity: 1 },
		]);
	});
});
