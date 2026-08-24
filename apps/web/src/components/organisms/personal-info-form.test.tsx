import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	updateMyProfileMock,
	updateUserMock,
	toastErrorMock,
	toastSuccessMock,
} = vi.hoisted(() => ({
	updateMyProfileMock: vi.fn(),
	updateUserMock: vi.fn(),
	toastErrorMock: vi.fn(),
	toastSuccessMock: vi.fn(),
}));

vi.mock("@/api/requests/users/update-my-profile", () => ({
	updateMyProfile: updateMyProfileMock,
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: { updateUser: updateUserMock },
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: PersonalInfoForm } = await import("./personal-info-form");

const baseProfile = {
	id: "user-1",
	name: "Jane Doe",
	email: "jane@example.com",
	role: "cliente" as const,
	cinemaName: null,
	cnpj: null,
	zipCode: null,
	street: null,
	number: null,
	complement: null,
	neighborhood: null,
	city: null,
	state: null,
};

beforeEach(() => {
	updateMyProfileMock.mockReset();
	updateUserMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

describe("PersonalInfoForm", () => {
	it("updates the profile and calls onSaved on success", async () => {
		const onSaved = vi.fn();
		updateMyProfileMock.mockResolvedValue({ ...baseProfile, name: "New Name" });

		render(<PersonalInfoForm profile={baseProfile} onSaved={onSaved} />);
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "New Name" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar dados pessoais" }),
		);

		await waitFor(() => {
			expect(updateMyProfileMock).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "New Name",
					email: "jane@example.com",
				}),
			);
		});
		expect(updateUserMock).toHaveBeenCalledWith({ name: "New Name" });
		expect(onSaved).toHaveBeenCalledWith({ ...baseProfile, name: "New Name" });
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows a specific error when the email is already in use", async () => {
		updateMyProfileMock.mockRejectedValue({
			isAxiosError: true,
			response: { data: { code: "EMAIL_ALREADY_IN_USE" } },
		});

		render(<PersonalInfoForm profile={baseProfile} onSaved={vi.fn()} />);
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar dados pessoais" }),
		);

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Já existe um usuário com esse e-mail.",
			);
		});
	});
});
