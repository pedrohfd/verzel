import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createGatekeeperMock, toastErrorMock, toastSuccessMock } = vi.hoisted(
	() => ({
		createGatekeeperMock: vi.fn(),
		toastErrorMock: vi.fn(),
		toastSuccessMock: vi.fn(),
	}),
);

vi.mock("@/api/requests/gatekeepers/create-gatekeeper", () => ({
	createGatekeeper: createGatekeeperMock,
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: GatekeeperForm } = await import("./gatekeeper-form");

beforeEach(() => {
	createGatekeeperMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Nome"), {
		target: { value: "Porteiro Um" },
	});
	fireEvent.change(screen.getByLabelText("E-mail"), {
		target: { value: "porteiro@example.com" },
	});
	fireEvent.change(screen.getByLabelText("Senha"), {
		target: { value: "password123" },
	});
}

describe("GatekeeperForm", () => {
	it("creates the gatekeeper and calls onSaved on success", async () => {
		const onSaved = vi.fn();
		createGatekeeperMock.mockResolvedValue({
			id: "user-1",
			name: "Porteiro Um",
			email: "porteiro@example.com",
			role: "portaria",
		});

		render(<GatekeeperForm onSaved={onSaved} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar porteiro" }));

		await waitFor(() => {
			expect(createGatekeeperMock).toHaveBeenCalledWith({
				name: "Porteiro Um",
				email: "porteiro@example.com",
				password: "password123",
			});
		});
		await waitFor(() => {
			expect(onSaved).toHaveBeenCalled();
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when the request fails", async () => {
		createGatekeeperMock.mockRejectedValue(new Error("failed"));

		render(<GatekeeperForm onSaved={vi.fn()} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar porteiro" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Não foi possível cadastrar o porteiro.",
			);
		});
	});

	it("shows a specific error toast when the email is already in use", async () => {
		createGatekeeperMock.mockRejectedValue({
			isAxiosError: true,
			response: { data: { code: "EMAIL_ALREADY_IN_USE" } },
		});

		render(<GatekeeperForm onSaved={vi.fn()} />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar porteiro" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Já existe um usuário com esse e-mail.",
			);
		});
	});

	it("does not submit with an invalid email", async () => {
		render(<GatekeeperForm onSaved={vi.fn()} />);

		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Porteiro Um" },
		});
		fireEvent.change(screen.getByLabelText("E-mail"), {
			target: { value: "not-an-email" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar porteiro" }));

		await waitFor(() => {
			expect(createGatekeeperMock).not.toHaveBeenCalled();
		});
	});
});
