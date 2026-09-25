import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PurchaseSummary from "./purchase-summary";

function normalize(text: string | null) {
	return (text ?? "").replace(/\s/g, " ");
}

describe("PurchaseSummary", () => {
	it("shows the tickets, the combos and a single total for the purchase", () => {
		render(
			<PurchaseSummary
				ticketCount={3}
				ticketPriceCents={2000}
				comboLines={[
					{ id: "c1", name: "Pipoca", quantity: 2, subtotalCents: 3000 },
				]}
			/>,
		);

		expect(normalize(screen.getByText(/Ingressos/).textContent)).toContain(
			"3x Ingressos — R$ 60,00",
		);
		expect(normalize(screen.getByText(/Pipoca/).textContent)).toContain(
			"2x Pipoca — R$ 30,00",
		);
		expect(normalize(screen.getByText(/Total/).textContent)).toContain(
			"Total: R$ 90,00",
		);
	});

	it("uses the singular for a single ticket", () => {
		render(
			<PurchaseSummary
				ticketCount={1}
				ticketPriceCents={2000}
				comboLines={[]}
			/>,
		);

		expect(normalize(screen.getByText(/Ingresso/).textContent)).toContain(
			"1x Ingresso — R$ 20,00",
		);
	});
});
