import { describe, expect, it } from "vitest";

import { selectableSeatLimit } from "./purchase-limits";

describe("selectableSeatLimit", () => {
	it("allows the full limit when the customer holds nothing in the session", () => {
		expect(selectableSeatLimit({ activeHolds: 0, heldInSelection: 0 })).toBe(
			10,
		);
	});

	it("subtracts holds the customer has elsewhere in the session", () => {
		expect(selectableSeatLimit({ activeHolds: 7, heldInSelection: 0 })).toBe(3);
	});

	it("does not subtract holds already shown in the current selection", () => {
		expect(selectableSeatLimit({ activeHolds: 7, heldInSelection: 4 })).toBe(7);
	});

	it("never goes below zero", () => {
		expect(selectableSeatLimit({ activeHolds: 12, heldInSelection: 0 })).toBe(
			0,
		);
	});
});
