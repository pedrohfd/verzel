import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createComboMock, updateComboMock, toastErrorMock, toastSuccessMock } =
	vi.hoisted(() => ({
		createComboMock: vi.fn(),
		updateComboMock: vi.fn(),
		toastErrorMock: vi.fn(),
		toastSuccessMock: vi.fn(),
	}));

vi.mock("@/api/requests/combos/create-combo", () => ({
	createCombo: createComboMock,
}));

vi.mock("@/api/requests/combos/update-combo", () => ({
	updateCombo: updateComboMock,
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: ComboForm } = await import("./combo-form");

beforeEach(() => {
	createComboMock.mockReset();
	updateComboMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Nome do combo"), {
		target: { value: "Combo Casal" },
	});
	fireEvent.change(screen.getByLabelText("Preço (R$)"), {
		target: { value: "44,90" },
	});
}

describe("ComboForm", () => {
	it("rejects an invalid price", async () => {
		render(<ComboForm onSaved={vi.fn()} />);

		fireEvent.change(screen.getByLabelText("Nome do combo"), {
			target: { value: "Combo Casal" },
		});
		fireEvent.change(screen.getByLabelText("Preço (R$)"), {
			target: { value: "0" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar combo" }));

		await waitFor(() => {
			expect(createComboMock).not.toHaveBeenCalled();
		});
	});

	it("creates the combo and calls onSaved on success", async () => {
		const onSaved = vi.fn();
		createComboMock.mockResolvedValue({
			id: "combo-1",
			organizerId: "organizer-1",
			name: "Combo Casal",
			description: null,
			priceCents: 4490,
			active: true,
			createdAt: "",
			updatedAt: "",
		});

		render(<ComboForm onSaved={onSaved} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Criar combo" }));

		await waitFor(() => {
			expect(createComboMock).toHaveBeenCalledWith({
				name: "Combo Casal",
				description: null,
				priceCents: 4490,
				active: true,
			});
		});
		await waitFor(() => {
			expect(onSaved).toHaveBeenCalledWith(
				expect.objectContaining({ id: "combo-1" }),
			);
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when creating the combo fails", async () => {
		createComboMock.mockRejectedValue(new Error("failed"));

		render(<ComboForm onSaved={vi.fn()} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Criar combo" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Não foi possível criar o combo.",
			);
		});
	});

	describe("editing mode", () => {
		const existingCombo = {
			id: "combo-1",
			organizerId: "organizer-1",
			name: "Combo Casal",
			description: "Pipoca grande + 2 refrigerantes",
			priceCents: 4490,
			active: true,
			createdAt: "",
			updatedAt: "",
		};

		it("pre-fills the fields from the given combo", () => {
			render(<ComboForm combo={existingCombo} onSaved={vi.fn()} />);

			expect(screen.getByLabelText("Nome do combo")).toHaveValue("Combo Casal");
			expect(screen.getByLabelText("Preço (R$)")).toHaveValue("44,90");
			expect(
				screen.getByRole("button", { name: "Salvar alterações" }),
			).toBeInTheDocument();
		});

		it("updates the combo and calls onSaved on success", async () => {
			const onSaved = vi.fn();
			updateComboMock.mockResolvedValue({
				...existingCombo,
				name: "Combo Casal Promo",
			});

			render(<ComboForm combo={existingCombo} onSaved={onSaved} />);
			fireEvent.change(screen.getByLabelText("Nome do combo"), {
				target: { value: "Combo Casal Promo" },
			});
			fireEvent.click(
				screen.getByRole("button", { name: "Salvar alterações" }),
			);

			await waitFor(() => {
				expect(updateComboMock).toHaveBeenCalledWith("combo-1", {
					name: "Combo Casal Promo",
					description: existingCombo.description,
					priceCents: 4490,
					active: true,
				});
			});
			await waitFor(() => {
				expect(onSaved).toHaveBeenCalledWith(
					expect.objectContaining({ name: "Combo Casal Promo" }),
				);
			});
			expect(toastSuccessMock).toHaveBeenCalled();
		});
	});
});
