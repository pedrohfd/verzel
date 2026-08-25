import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PriceRangeInput from "./price-range-input";

describe("PriceRangeInput", () => {
	it("renders empty inputs when no values are set", () => {
		render(
			<PriceRangeInput
				minCents={undefined}
				maxCents={undefined}
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Preço mínimo")).toHaveValue(null);
		expect(screen.getByLabelText("Preço máximo")).toHaveValue(null);
	});

	it("renders reais values converted from cents", () => {
		render(
			<PriceRangeInput minCents={1000} maxCents={5000} onChange={vi.fn()} />,
		);

		expect(screen.getByLabelText("Preço mínimo")).toHaveValue(10);
		expect(screen.getByLabelText("Preço máximo")).toHaveValue(50);
	});

	it("converts a typed min value to cents", () => {
		const onChange = vi.fn();
		render(
			<PriceRangeInput
				minCents={undefined}
				maxCents={undefined}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Preço mínimo"), {
			target: { value: "15" },
		});

		expect(onChange).toHaveBeenCalledWith({
			minCents: 1500,
			maxCents: undefined,
		});
	});

	it("converts a typed max value to cents", () => {
		const onChange = vi.fn();
		render(
			<PriceRangeInput
				minCents={1000}
				maxCents={undefined}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Preço máximo"), {
			target: { value: "30" },
		});

		expect(onChange).toHaveBeenCalledWith({
			minCents: 1000,
			maxCents: 3000,
		});
	});

	it("clears the value when the input is emptied", () => {
		const onChange = vi.fn();
		render(
			<PriceRangeInput
				minCents={1000}
				maxCents={undefined}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Preço mínimo"), {
			target: { value: "" },
		});

		expect(onChange).toHaveBeenCalledWith({
			minCents: undefined,
			maxCents: undefined,
		});
	});
});
