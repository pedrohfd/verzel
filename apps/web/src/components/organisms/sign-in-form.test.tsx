import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	useSessionMock,
	signInEmailMock,
	navigateMock,
	toastErrorMock,
	toastSuccessMock,
} = vi.hoisted(() => ({
	useSessionMock: vi.fn(),
	signInEmailMock: vi.fn(),
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
		signIn: { email: signInEmailMock },
	},
}));

vi.mock("sonner", () => ({
	toast: { error: toastErrorMock, success: toastSuccessMock },
}));

const { default: SignInForm } = await import("./sign-in-form");

beforeEach(() => {
	useSessionMock.mockReturnValue({ isPending: false });
	signInEmailMock.mockReset();
	navigateMock.mockReset();
	toastErrorMock.mockReset();
	toastSuccessMock.mockReset();
});

function fillValidForm() {
	fireEvent.change(screen.getByLabelText("E-mail"), {
		target: { value: "alice@example.com" },
	});
	fireEvent.change(screen.getByLabelText("Senha"), {
		target: { value: "password123" },
	});
}

describe("SignInForm", () => {
	it("shows a loader while the session is pending", () => {
		useSessionMock.mockReturnValue({ isPending: true });

		render(<SignInForm />);

		expect(screen.queryByText("Bem-vindo de volta")).not.toBeInTheDocument();
	});

	it("signs in and navigates home on success", async () => {
		signInEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onSuccess(),
		);

		render(<SignInForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
		});
		expect(toastSuccessMock).toHaveBeenCalled();
	});

	it("shows an error toast when sign in fails", async () => {
		signInEmailMock.mockImplementation((_payload, callbacks) =>
			callbacks.onError({
				error: { message: "invalid credentials", statusText: "Unauthorized" },
			}),
		);

		render(<SignInForm />);
		fillValidForm();
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		await waitFor(() => {
			expect(toastErrorMock).toHaveBeenCalledWith("invalid credentials");
		});
	});
});
