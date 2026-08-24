import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	updateMyProfileMock,
	getAddressByCepMock,
	toastErrorMock,
	toastSuccessMock,
} = vi.hoisted(() => ({
	updateMyProfileMock: vi.fn(),
	getAddressByCepMock: vi.fn(),
	toastErrorMock: vi.fn(),
	toastSuccessMock: vi.fn(),
}));

vi.mock("@/api/requests/users/update-my-profile", () => ({
	updateMyProfile: updateMyProfileMock,
}));

vi.mock("@/api/requests/cinemas/get-address-by-cep", () => ({
	getAddressByCep: getAddressByCepMock,
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: CinemaInfoForm } = await import("./cinema-info-form");

const organizerProfile = {
	id: "user-1",
	name: "Jane Doe",
	email: "jane@example.com",
	role: "organizador" as const,
	cinemaName: "Cine Verzel",
	cnpj: "11222333000181",
	zipCode: "00000000",
	street: "Rua A",
	number: "10",
	complement: null,
	neighborhood: "Centro",
	city: "São Paulo",
	state: "SP",
};

beforeEach(() => {
	updateMyProfileMock.mockReset();
	getAddressByCepMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

describe("CinemaInfoForm", () => {
	it("prefills fields with masked cnpj and zip code", () => {
		render(<CinemaInfoForm profile={organizerProfile} onSaved={vi.fn()} />);

		expect(screen.getByLabelText("CNPJ")).toHaveValue("11.222.333/0001-81");
		expect(screen.getByLabelText("CEP")).toHaveValue("00000-000");
	});

	it("submits including the user's current name and email", async () => {
		const onSaved = vi.fn();
		updateMyProfileMock.mockResolvedValue({
			...organizerProfile,
			cinemaName: "Novo Cinema",
		});

		render(<CinemaInfoForm profile={organizerProfile} onSaved={onSaved} />);
		fireEvent.change(screen.getByLabelText("Nome do cinema/rede"), {
			target: { value: "Novo Cinema" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Salvar dados do cinema" }),
		);

		await waitFor(() => {
			expect(updateMyProfileMock).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Jane Doe",
					email: "jane@example.com",
					cinemaName: "Novo Cinema",
				}),
			);
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("autofills address fields when the CEP lookup succeeds", async () => {
		getAddressByCepMock.mockResolvedValue({
			cep: "01310-100",
			logradouro: "Avenida Paulista",
			complemento: "",
			bairro: "Bela Vista",
			localidade: "São Paulo",
			uf: "SP",
		});

		render(<CinemaInfoForm profile={organizerProfile} onSaved={vi.fn()} />);
		fireEvent.change(screen.getByLabelText("CEP"), {
			target: { value: "01310-100" },
		});
		fireEvent.blur(screen.getByLabelText("CEP"));

		await waitFor(() => {
			expect(screen.getByLabelText("Rua")).toHaveValue("Avenida Paulista");
		});
	});
});
