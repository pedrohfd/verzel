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

import CinemaSelect from "./cinema-select";

describe("CinemaSelect", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders the select even when there is only one cinema", () => {
		const onChange = vi.fn();
		render(
			<CinemaSelect
				cinemas={["Cinema A"]}
				value="Cinema A"
				onChange={onChange}
			/>,
		);

		expect(screen.getByText("Cinema A")).toBeInTheDocument();
	});

	it("lists all cinemas", () => {
		render(
			<CinemaSelect
				cinemas={["Cinema A", "Cinema B"]}
				value="Cinema A"
				onChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("Cinema A")).toBeInTheDocument();
		expect(screen.getByText("Cinema B")).toBeInTheDocument();
	});

	it("calls onChange with the selected cinema", () => {
		const onChange = vi.fn();
		render(
			<CinemaSelect
				cinemas={["Cinema A", "Cinema B"]}
				value="Cinema A"
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Cinema"), {
			target: { value: "Cinema B" },
		});

		expect(onChange).toHaveBeenCalledWith("Cinema B");
	});

	it("does not call onChange when the same cinema is selected", () => {
		const onChange = vi.fn();
		render(
			<CinemaSelect
				cinemas={["Cinema A", "Cinema B"]}
				value="Cinema A"
				onChange={onChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Cinema"), {
			target: { value: "Cinema A" },
		});

		expect(onChange).not.toHaveBeenCalled();
	});
});
