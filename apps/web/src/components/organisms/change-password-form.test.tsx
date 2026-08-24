import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { changePasswordMock, toastErrorMock, toastSuccessMock } = vi.hoisted(
	() => ({
		changePasswordMock: vi.fn(),
		toastErrorMock: vi.fn(),
		toastSuccessMock: vi.fn(),
	}),
);

vi.mock("@/lib/auth-client", () => ({
	authClient: { changePassword: changePasswordMock },
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: ChangePasswordForm } = await import("./change-password-form");

beforeEach(() => {
	changePasswordMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Senha atual"), {
		target: { value: "oldpassword" },
	});
	fireEvent.change(screen.getByLabelText("Nova senha"), {
		target: { value: "newpassword123" },
	});
	fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
		target: { value: "newpassword123" },
	});
}

describe("ChangePasswordForm", () => {
	it("changes the password on success", async () => {
		changePasswordMock.mockImplementation((_payload, callbacks) =>
			callbacks.onSuccess(),
		);

		render(<ChangePasswordForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

		await waitFor(() => {
			expect(changePasswordMock).toHaveBeenCalledWith(
				{
					currentPassword: "oldpassword",
					newPassword: "newpassword123",
					revokeOtherSessions: false,
				},
				expect.anything(),
			);
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when the current password is wrong", async () => {
		changePasswordMock.mockImplementation((_payload, callbacks) =>
			callbacks.onError({ error: { message: "Invalid password" } }),
		);

		render(<ChangePasswordForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith("Invalid password");
		});
	});

	it("does not submit when the passwords do not match", async () => {
		render(<ChangePasswordForm />);
		fireEvent.change(screen.getByLabelText("Senha atual"), {
			target: { value: "oldpassword" },
		});
		fireEvent.change(screen.getByLabelText("Nova senha"), {
			target: { value: "newpassword123" },
		});
		fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
			target: { value: "different" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

		await waitFor(() => {
			expect(screen.getByText("As senhas não coincidem")).toBeInTheDocument();
		});
		expect(changePasswordMock).not.toHaveBeenCalled();
	});
});
