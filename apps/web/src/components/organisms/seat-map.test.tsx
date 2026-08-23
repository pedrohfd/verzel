import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SeatMap from "./seat-map";

const seats: import("@/api/types").Seat[] = [
	{
		id: "seat-1",
		eventId: "event-1",
		row: 0,
		column: 0,
		label: "A1",
		status: "available",
	},
	{
		id: "seat-2",
		eventId: "event-1",
		row: 0,
		column: 1,
		label: "A2",
		status: "taken",
	},
	{
		id: "seat-3",
		eventId: "event-1",
		row: 0,
		column: 2,
		label: "A3",
		status: "available",
	},
];

describe("SeatMap", () => {
	it("renders one button per seat", () => {
		render(<SeatMap seats={seats} selectedSeats={[]} onSelect={vi.fn()} />);

		expect(screen.getByLabelText("Assento A1")).toBeInTheDocument();
		expect(screen.getByLabelText("Assento A2 (ocupado)")).toBeInTheDocument();
	});

	it("disables taken seats", () => {
		render(<SeatMap seats={seats} selectedSeats={[]} onSelect={vi.fn()} />);

		expect(screen.getByLabelText("Assento A2 (ocupado)")).toBeDisabled();
	});

	it("marks the selected seat as pressed", () => {
		render(
			<SeatMap
				seats={seats}
				selectedSeats={[{ row: 0, column: 0 }]}
				onSelect={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Assento A1")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("calls onSelect with the clicked seat", () => {
		const onSelect = vi.fn();
		render(<SeatMap seats={seats} selectedSeats={[]} onSelect={onSelect} />);

		fireEvent.click(screen.getByLabelText("Assento A1"));

		expect(onSelect).toHaveBeenCalledWith(seats[0]);
	});

	it("renders the row letter on both sides of the row", () => {
		const { container } = render(
			<SeatMap seats={seats} selectedSeats={[]} onSelect={vi.fn()} />,
		);

		expect(screen.getAllByText("A")).toHaveLength(2);
		expect(container.querySelectorAll('[data-slot="seat-block"]')).toHaveLength(
			1,
		);
	});

	it("renders a screen indicator with the TELA label", () => {
		render(<SeatMap seats={seats} selectedSeats={[]} onSelect={vi.fn()} />);

		expect(screen.getByText("TELA")).toBeInTheDocument();
	});

	it("splits a row into two blocks when there is an aisle", () => {
		const wideRowSeats: import("@/api/types").Seat[] = Array.from(
			{ length: 6 },
			(_, column) => ({
				id: `seat-${column}`,
				eventId: "event-1",
				row: 0,
				column,
				label: `A${column + 1}`,
				status: "available",
			}),
		);

		const { container } = render(
			<SeatMap seats={wideRowSeats} selectedSeats={[]} onSelect={vi.fn()} />,
		);

		expect(container.querySelectorAll('[data-slot="seat-block"]')).toHaveLength(
			2,
		);
	});
});
