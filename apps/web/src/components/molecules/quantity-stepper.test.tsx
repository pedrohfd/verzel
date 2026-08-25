import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import QuantityStepper from "./quantity-stepper";

describe("QuantityStepper", () => {
	it("shows the current value", () => {
		render(<QuantityStepper value={2} onChange={vi.fn()} label="Pipoca" />);

		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("calls onChange with value + 1 when the plus button is clicked", () => {
		const onChange = vi.fn();
		render(<QuantityStepper value={0} onChange={onChange} label="Pipoca" />);

		fireEvent.click(screen.getByLabelText("Aumentar quantidade de Pipoca"));

		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("calls onChange with value - 1 when the minus button is clicked", () => {
		const onChange = vi.fn();
		render(<QuantityStepper value={2} onChange={onChange} label="Pipoca" />);

		fireEvent.click(screen.getByLabelText("Diminuir quantidade de Pipoca"));

		expect(onChange).toHaveBeenCalledWith(1);
	});

	it("disables the minus button when value is 0", () => {
		render(<QuantityStepper value={0} onChange={vi.fn()} label="Pipoca" />);

		expect(
			screen.getByLabelText("Diminuir quantidade de Pipoca"),
		).toBeDisabled();
	});
});
