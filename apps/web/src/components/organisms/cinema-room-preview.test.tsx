import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CinemaRoomPreview from "./cinema-room-preview";

describe("CinemaRoomPreview", () => {
	it("shows a placeholder when rows or columns are missing", () => {
		render(<CinemaRoomPreview rows={0} columns={10} />);

		expect(
			screen.getByText("Informe fileiras e assentos para visualizar a sala."),
		).toBeInTheDocument();
	});

	it("renders the screen indicator and the row/seat summary", () => {
		render(<CinemaRoomPreview rows={8} columns={10} />);

		expect(screen.getByText("TELA")).toBeInTheDocument();
		expect(
			screen.getByText("8 fileiras × 10 assentos = 80 lugares"),
		).toBeInTheDocument();
	});

	it("renders a row label on both sides of each row", () => {
		render(<CinemaRoomPreview rows={3} columns={5} />);

		expect(screen.getAllByText("A")).toHaveLength(2);
		expect(screen.getAllByText("B")).toHaveLength(2);
		expect(screen.getAllByText("C")).toHaveLength(2);
	});

	it("splits a row into two blocks when there is an aisle", () => {
		const { container } = render(<CinemaRoomPreview rows={1} columns={6} />);

		expect(container.querySelectorAll(".grid")).toHaveLength(2);
	});

	it("does not split a short row into an aisle", () => {
		const { container } = render(<CinemaRoomPreview rows={1} columns={3} />);

		expect(container.querySelectorAll(".grid")).toHaveLength(1);
	});
});
