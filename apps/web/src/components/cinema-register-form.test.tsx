import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	useSessionMock,
	signUpEmailMock,
	navigateMock,
	registerCinemaMock,
	toastErrorMock,
	toastSuccessMock,
} = vi.hoisted(() => ({
	useSessionMock: vi.fn(),
	signUpEmailMock: vi.fn(),
	navigateMock: vi.fn(),
	registerCinemaMock: vi.fn(),
	toastErrorMock: vi.fn(),
	toastSuccessMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateMock,
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: useSessionMock,
		signUp: { email: signUpEmailMock },
	},
}));

vi.mock("@/api/requests/cinemas/register-cinema", () => ({
	registerCinema: registerCinemaMock,
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: CinemaRegisterForm } = await import("./cinema-register-form");

beforeEach(() => {
	useSessionMock.mockReturnValue({ isPending: false });
	signUpEmailMock.mockReset();
	navigateMock.mockReset();
	registerCinemaMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Nome do responsável"), {
		target: { value: "Alice" },
	});
	fireEvent.change(screen.getByLabelText("E-mail"), {
		target: { value: "alice@example.com" },
	});
	fireEvent.change(screen.getByLabelText("Senha"), {
		target: { value: "password123" },
	});
	fireEvent.change(screen.getByLabelText("Nome do cinema/rede"), {
		target: { value: "Cine Verzel" },
	});
	fireEvent.change(screen.getByLabelText("CNPJ"), {
		target: { value: "00.000.000/0000-00" },
	});
	fireEvent.change(screen.getByLabelText("CEP"), {
		target: { value: "00000-000" },
	});
	fireEvent.change(screen.getByLabelText("Rua"), {
		target: { value: "Rua A" },
	});
	fireEvent.change(screen.getByLabelText("Número"), {
		target: { value: "10" },
	});
	fireEvent.change(screen.getByLabelText("Bairro"), {
		target: { value: "Centro" },
	});
	fireEvent.change(screen.getByLabelText("Cidade"), {
		target: { value: "São Paulo" },
	});
	fireEvent.change(screen.getByLabelText("Estado"), {
		target: { value: "SP" },
	});
}

describe("CinemaRegisterForm", () => {
	it("shows a loader while the session is pending", () => {
		useSessionMock.mockReturnValue({ isPending: true });

		render(<CinemaRegisterForm />);

		expect(screen.queryByText("Cadastro de cinema")).not.toBeInTheDocument();
	});

	it("renders every field of the form", () => {
		render(<CinemaRegisterForm />);

		expect(screen.getByText("Cadastro de cinema")).toBeInTheDocument();
		expect(screen.getByLabelText("Nome do responsável")).toBeInTheDocument();
		expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
	});

	it("signs up, registers the cinema and navigates on success", async () => {
		signUpEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onSuccess(),
		);
		registerCinemaMock.mockResolvedValue({ id: "user-1" });

		render(<CinemaRegisterForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar cinema" }));

		await waitFor(() => {
			expect(registerCinemaMock).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({ to: "/organizer" });
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when registering the cinema fails", async () => {
		signUpEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onSuccess(),
		);
		registerCinemaMock.mockRejectedValue(new Error("boom"));

		render(<CinemaRegisterForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar cinema" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith(
				"Não foi possível concluir o cadastro do cinema.",
			);
		});
		expect(navigateMock).not.toHaveBeenCalled();
	});

	it("shows an error toast when sign up fails", async () => {
		signUpEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onError({
				error: { message: "email in use", statusText: "Conflict" },
			}),
		);

		render(<CinemaRegisterForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar cinema" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith("email in use");
		});
	});
});
