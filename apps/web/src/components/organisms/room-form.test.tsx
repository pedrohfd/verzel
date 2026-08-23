import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRoomMock, updateRoomMock, toastErrorMock, toastSuccessMock } =
	vi.hoisted(() => ({
		createRoomMock: vi.fn(),
		updateRoomMock: vi.fn(),
		toastErrorMock: vi.fn(),
		toastSuccessMock: vi.fn(),
	}));

vi.mock("@/api/requests/rooms/create-room", () => ({
	createRoom: createRoomMock,
}));

vi.mock("@/api/requests/rooms/update-room", () => ({
	updateRoom: updateRoomMock,
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: RoomForm } = await import("./room-form");

beforeEach(() => {
	createRoomMock.mockReset();
	updateRoomMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Nome da sala"), {
		target: { value: "Sala 1" },
	});
	fireEvent.change(screen.getByLabelText("Fileiras"), {
		target: { value: "8" },
	});
	fireEvent.change(screen.getByLabelText("Assentos por fileira"), {
		target: { value: "10" },
	});
}

describe("RoomForm", () => {
	it("shows the room preview updating with rows/columns input", () => {
		render(<RoomForm onSaved={vi.fn()} />);

		fireEvent.change(screen.getByLabelText("Fileiras"), {
			target: { value: "3" },
		});
		fireEvent.change(screen.getByLabelText("Assentos por fileira"), {
			target: { value: "5" },
		});

		expect(
			screen.getByText("3 fileiras × 5 assentos = 15 lugares"),
		).toBeInTheDocument();
	});

	it("rejects seats per row above the maximum of 14", async () => {
		render(<RoomForm onSaved={vi.fn()} />);

		fireEvent.change(screen.getByLabelText("Nome da sala"), {
			target: { value: "Sala 1" },
		});
		fireEvent.change(screen.getByLabelText("Fileiras"), {
			target: { value: "8" },
		});
		fireEvent.change(screen.getByLabelText("Assentos por fileira"), {
			target: { value: "15" },
		});

		expect(screen.getByLabelText("Assentos por fileira")).toHaveAttribute(
			"max",
			"14",
		);

		fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));

		await waitFor(() => {
			expect(createRoomMock).not.toHaveBeenCalled();
		});
	});

	it("creates the room and calls onSaved on success", async () => {
		const onSaved = vi.fn();
		createRoomMock.mockResolvedValue({
			id: "room-1",
			organizerId: "organizer-1",
			name: "Sala 1",
			rows: 8,
			columns: 10,
			createdAt: "",
			updatedAt: "",
		});

		render(<RoomForm onSaved={onSaved} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));

		await waitFor(() => {
			expect(createRoomMock).toHaveBeenCalledWith({
				name: "Sala 1",
				rows: 8,
				columns: 10,
			});
		});
		await waitFor(() => {
			expect(onSaved).toHaveBeenCalledWith(
				expect.objectContaining({ id: "room-1" }),
			);
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when creating the room fails", async () => {
		createRoomMock.mockRejectedValue(new Error("failed"));

		render(<RoomForm onSaved={vi.fn()} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Não foi possível criar a sala.",
			);
		});
	});

	describe("editing mode", () => {
		const existingRoom = {
			id: "room-1",
			organizerId: "organizer-1",
			name: "Sala existente",
			rows: 6,
			columns: 12,
			createdAt: "",
			updatedAt: "",
		};

		it("pre-fills the fields from the given room", () => {
			render(<RoomForm room={existingRoom} onSaved={vi.fn()} />);

			expect(screen.getByLabelText("Nome da sala")).toHaveValue(
				"Sala existente",
			);
			expect(screen.getByLabelText("Fileiras")).toHaveValue(6);
			expect(screen.getByLabelText("Assentos por fileira")).toHaveValue(12);
			expect(
				screen.getByRole("button", { name: "Salvar alterações" }),
			).toBeInTheDocument();
		});

		it("updates the room and calls onSaved on success", async () => {
			const onSaved = vi.fn();
			updateRoomMock.mockResolvedValue({ ...existingRoom, name: "Sala nova" });

			render(<RoomForm room={existingRoom} onSaved={onSaved} />);
			fireEvent.change(screen.getByLabelText("Nome da sala"), {
				target: { value: "Sala nova" },
			});
			fireEvent.click(
				screen.getByRole("button", { name: "Salvar alterações" }),
			);

			await waitFor(() => {
				expect(updateRoomMock).toHaveBeenCalledWith("room-1", {
					name: "Sala nova",
					rows: 6,
					columns: 12,
				});
			});
			await waitFor(() => {
				expect(onSaved).toHaveBeenCalledWith(
					expect.objectContaining({ name: "Sala nova" }),
				);
			});
			expect(toastSuccessMock).toHaveBeenCalled();
		});

		it("shows an error toast when updating the room fails", async () => {
			updateRoomMock.mockRejectedValue(new Error("failed"));

			render(<RoomForm room={existingRoom} onSaved={vi.fn()} />);
			fireEvent.click(
				screen.getByRole("button", { name: "Salvar alterações" }),
			);

			await waitFor(() => {
				expect(toastErrorMock).toHaveBeenCalledWith(
					"Não foi possível salvar as alterações.",
				);
			});
		});
	});
});
