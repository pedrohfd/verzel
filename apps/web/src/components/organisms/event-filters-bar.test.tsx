import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@verzel/ui/components/select", () => ({
	Select: ({
		value,
		onValueChange,
		items,
	}: {
		value: string;
		onValueChange: (value: string) => void;
		items: { value: string; label: string }[];
	}) => (
		<select
			aria-label="Cinema"
			value={value}
			onChange={(e) => onValueChange(e.target.value)}
		>
			{items.map((item) => (
				<option key={item.value} value={item.value}>
					{item.label}
				</option>
			))}
		</select>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectValue: () => null,
}));

import EventFiltersBar from "./event-filters-bar";

const emptyFilters = {
	date: "",
	venue: "",
	priceMin: undefined,
	priceMax: undefined,
};

describe("EventFiltersBar", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("does not render the venue select when there are no venues", () => {
		render(
			<EventFiltersBar venues={[]} filters={emptyFilters} onChange={vi.fn()} />,
		);

		expect(screen.queryByLabelText("Cinema")).not.toBeInTheDocument();
	});

	it("lists all venues plus an 'all' option", () => {
		render(
			<EventFiltersBar
				venues={["Cine Downtown", "Cine Norte"]}
				filters={emptyFilters}
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("Todos os cinemas")).toBeInTheDocument();
		expect(screen.getByText("Cine Downtown")).toBeInTheDocument();
		expect(screen.getByText("Cine Norte")).toBeInTheDocument();
	});

	it("calls onChange with the selected venue", () => {
		const onChange = vi.fn();
		render(
			<EventFiltersBar
				venues={["Cine Downtown"]}
				filters={emptyFilters}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Cinema"), {
			target: { value: "Cine Downtown" },
		});

		expect(onChange).toHaveBeenCalledWith({
			...emptyFilters,
			venue: "Cine Downtown",
		});
	});

	it("clears the venue when the 'all' option is picked", () => {
		const onChange = vi.fn();
		render(
			<EventFiltersBar
				venues={["Cine Downtown"]}
				filters={{ ...emptyFilters, venue: "Cine Downtown" }}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Cinema"), {
			target: { value: "__all__" },
		});

		expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, venue: "" });
	});

	it("calls onChange when the price range changes", () => {
		const onChange = vi.fn();
		render(
			<EventFiltersBar
				venues={[]}
				filters={emptyFilters}
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Preço mínimo"), {
			target: { value: "10" },
		});

		expect(onChange).toHaveBeenCalledWith({
			...emptyFilters,
			priceMin: 1000,
		});
	});
});
