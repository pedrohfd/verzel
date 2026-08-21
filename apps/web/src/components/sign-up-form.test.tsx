import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	useSessionMock,
	signUpEmailMock,
	navigateMock,
	toastErrorMock,
	toastSuccessMock,
} = vi.hoisted(() => ({
	useSessionMock: vi.fn(),
	signUpEmailMock: vi.fn(),
	navigateMock: vi.fn(),
	toastErrorMock: vi.fn(),
	toastSuccessMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateMock,
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: useSessionMock,
		signUp: { email: signUpEmailMock },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: SignUpForm } = await import("./sign-up-form");

beforeEach(() => {
	useSessionMock.mockReturnValue({ isPending: false });
	signUpEmailMock.mockReset();
	navigateMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("Nome"), {
		target: { value: "Alice" },
	});
	fireEvent.change(screen.getByLabelText("E-mail"), {
		target: { value: "alice@example.com" },
	});
	fireEvent.change(screen.getByLabelText("Senha"), {
		target: { value: "password123" },
	});
}

describe("SignUpForm", () => {
	it("shows a loader while the session is pending", () => {
		useSessionMock.mockReturnValue({ isPending: true });

		render(<SignUpForm />);

		expect(screen.queryByText("Criar conta")).not.toBeInTheDocument();
	});

	it("signs up and navigates home on success", async () => {
		signUpEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onSuccess(),
		);

		render(<SignUpForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when sign up fails", async () => {
		signUpEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onError({
				error: { message: "email in use", statusText: "Conflict" },
			}),
		);

		render(<SignUpForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith("email in use");
		});
	});
});
