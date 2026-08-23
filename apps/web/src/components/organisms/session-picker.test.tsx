import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import SessionPicker from "./session-picker";

describe("SessionPicker", () => {
	it("renders nothing when there are no cinemas", () => {
		const { container } = render(
			<SessionPicker
				cinemas={[]}
				venueName=""
				onSelectCinema={vi.fn()}
				times={[]}
				selectedTimeId=""
				onSelectTime={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("shows the current cinema and the other cinemas for the movie", () => {
		render(
			<SessionPicker
				cinemas={["Cinema A", "Cinema B"]}
				venueName="Cinema A"
				onSelectCinema={vi.fn()}
				times={[]}
				selectedTimeId=""
				onSelectTime={vi.fn()}
			/>,
		);

		expect(screen.getByText("Cinema A")).toBeInTheDocument();
		expect(screen.getByText("Cinema B")).toBeInTheDocument();
	});

	it("calls onSelectCinema when a different cinema is chosen", () => {
		const onSelectCinema = vi.fn();
		render(
			<SessionPicker
				cinemas={["Cinema A", "Cinema B"]}
				venueName="Cinema A"
				onSelectCinema={onSelectCinema}
				times={[]}
				selectedTimeId=""
				onSelectTime={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Cinema"), {
			target: { value: "Cinema B" },
		});

		expect(onSelectCinema).toHaveBeenCalledWith("Cinema B");
	});

	it("shows a time pill for each session and calls onSelectTime", () => {
		const onSelectTime = vi.fn();
		render(
			<SessionPicker
				cinemas={["Cinema A"]}
				venueName="Cinema A"
				onSelectCinema={vi.fn()}
				times={[
					{
						id: "event-1",
						date: new Date("2026-08-19T14:20:00"),
						roomName: "2",
					},
					{
						id: "event-2",
						date: new Date("2026-08-19T21:00:00"),
						roomName: "1",
					},
				]}
				selectedTimeId="event-1"
				onSelectTime={onSelectTime}
			/>,
		);

		expect(screen.getByText("14:20 · Sala 2")).toBeInTheDocument();
		fireEvent.click(screen.getByText("21:00 · Sala 1"));

		expect(onSelectTime).toHaveBeenCalledWith("event-2");
	});
});
