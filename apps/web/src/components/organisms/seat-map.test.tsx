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
		render(
			<SeatMap
				seats={seats}
				columns={3}
				selectedSeatId={null}
				onSelect={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Assento A1")).toBeInTheDocument();
		expect(screen.getByLabelText("Assento A2 (ocupado)")).toBeInTheDocument();
	});

	it("disables taken seats", () => {
		render(
			<SeatMap
				seats={seats}
				columns={3}
				selectedSeatId={null}
				onSelect={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Assento A2 (ocupado)")).toBeDisabled();
	});

	it("marks the selected seat as pressed", () => {
		render(
			<SeatMap
				seats={seats}
				columns={3}
				selectedSeatId="seat-1"
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
		render(
			<SeatMap
				seats={seats}
				columns={3}
				selectedSeatId={null}
				onSelect={onSelect}
			/>,
		);

		fireEvent.click(screen.getByLabelText("Assento A1"));

		expect(onSelect).toHaveBeenCalledWith(seats[0]);
	});
});
