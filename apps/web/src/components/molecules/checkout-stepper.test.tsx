import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CheckoutStepper from "./checkout-stepper";

describe("CheckoutStepper", () => {
	it("renders the three steps", () => {
		render(<CheckoutStepper current={1} />);

		expect(screen.getByText("1.Sessão & Assentos")).toBeInTheDocument();
		expect(screen.getByText("2.Combo")).toBeInTheDocument();
		expect(screen.getByText("3.Pagamento")).toBeInTheDocument();
	});

	it("highlights the current step", () => {
		render(<CheckoutStepper current={2} />);

		expect(screen.getByText("2.Combo")).toHaveClass("text-destructive");
		expect(screen.getByText("1.Sessão & Assentos")).not.toHaveClass(
			"text-destructive",
		);
	});
});
