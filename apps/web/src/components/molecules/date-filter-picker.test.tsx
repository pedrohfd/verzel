import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DateFilterPicker from "./date-filter-picker";

describe("DateFilterPicker", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 7, 15, 14, 30));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows the placeholder when no date is selected", () => {
		render(<DateFilterPicker value="" onChange={vi.fn()} />);

		expect(screen.getByText("Todas as datas")).toBeInTheDocument();
	});

	it("shows the formatted date when a value is selected", () => {
		render(<DateFilterPicker value="2026-08-20" onChange={vi.fn()} />);

		expect(screen.getByText(/20 de agosto de 2026/)).toBeInTheDocument();
	});

	it("calls onChange with the picked date", async () => {
		const onChange = vi.fn();
		render(<DateFilterPicker value="2026-08-15" onChange={onChange} />);

		fireEvent.click(screen.getByText(/15 de agosto de 2026/));

		const dayButton = await screen.findByRole("button", {
			name: /\b20 de /,
		});
		fireEvent.click(dayButton);

		expect(onChange).toHaveBeenCalledWith("2026-08-20");
	});

	it("clears the filter", async () => {
		const onChange = vi.fn();
		render(<DateFilterPicker value="2026-08-15" onChange={onChange} />);

		fireEvent.click(screen.getByText(/15 de agosto de 2026/));

		const clearButton = await screen.findByText("Limpar filtro de data");
		fireEvent.click(clearButton);

		expect(onChange).toHaveBeenCalledWith("");
	});
});
