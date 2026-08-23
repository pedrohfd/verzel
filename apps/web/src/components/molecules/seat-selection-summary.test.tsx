import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SeatSelectionSummary from "./seat-selection-summary";

const seatA: import("@/api/types").Seat = {
	id: "seat-1",
	eventId: "event-1",
	row: 0,
	column: 0,
	label: "A1",
	status: "available",
};

const seatB: import("@/api/types").Seat = {
	id: "seat-2",
	eventId: "event-1",
	row: 0,
	column: 1,
	label: "A2",
	status: "available",
};

describe("SeatSelectionSummary", () => {
	it("shows the empty state and zero total when nothing is selected", () => {
		render(
			<SeatSelectionSummary
				selectedSeats={[]}
				priceCents={2500}
				isReserving={false}
				onRemove={vi.fn()}
				onReserve={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Selecione os assentos no mapa ao lado."),
		).toBeInTheDocument();
		expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
	});

	it("shows a chip per seat and the summed total", () => {
		render(
			<SeatSelectionSummary
				selectedSeats={[seatA, seatB]}
				priceCents={2500}
				isReserving={false}
				onRemove={vi.fn()}
				onReserve={vi.fn()}
			/>,
		);

		expect(screen.getByText("A1")).toBeInTheDocument();
		expect(screen.getByText("A2")).toBeInTheDocument();
		expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
	});

	it("calls onRemove with the seat when its chip button is clicked", () => {
		const onRemove = vi.fn();
		render(
			<SeatSelectionSummary
				selectedSeats={[seatA, seatB]}
				priceCents={2500}
				isReserving={false}
				onRemove={onRemove}
				onReserve={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByLabelText("Remover assento A1"));

		expect(onRemove).toHaveBeenCalledWith(seatA);
	});

	it("disables the button when there are no selected seats", () => {
		render(
			<SeatSelectionSummary
				selectedSeats={[]}
				priceCents={2500}
				isReserving={false}
				onRemove={vi.fn()}
				onReserve={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
	});

	it("disables the button while reserving", () => {
		render(
			<SeatSelectionSummary
				selectedSeats={[seatA]}
				priceCents={2500}
				isReserving={true}
				onRemove={vi.fn()}
				onReserve={vi.fn()}
			/>,
		);

		expect(screen.getByText("Reservando...")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Reservando..." }),
		).toBeDisabled();
	});

	it("calls onReserve when the continue button is clicked", () => {
		const onReserve = vi.fn();
		render(
			<SeatSelectionSummary
				selectedSeats={[seatA]}
				priceCents={2500}
				isReserving={false}
				onRemove={vi.fn()}
				onReserve={onReserve}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

		expect(onReserve).toHaveBeenCalled();
	});
});
