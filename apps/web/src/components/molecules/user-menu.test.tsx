import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useSessionMock, navigateMock, signOutMock } = vi.hoisted(() => ({
	useSessionMock: vi.fn(),
	navigateMock: vi.fn(),
	signOutMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateMock,
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: { useSession: useSessionMock, signOut: signOutMock },
}));

vi.mock("@verzel/ui/components/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuItem: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
	}) =>
		onClick ? (
			<button type="button" onClick={onClick}>
				{children}
			</button>
		) : (
			<div>{children}</div>
		),
}));

const { default: UserMenu } = await import("./user-menu");

describe("UserMenu", () => {
	it("renders a skeleton while the session is pending", () => {
		useSessionMock.mockReturnValue({ isPending: true, data: null });

		const { container } = render(<UserMenu />);

		expect(
			container.querySelector('[data-slot="skeleton"]'),
		).toBeInTheDocument();
	});

	it("shows a login link when there is no session", () => {
		useSessionMock.mockReturnValue({ isPending: false, data: null });

		render(<UserMenu />);

		expect(screen.getByText("Entrar")).toBeInTheDocument();
	});

	it("greets the user when authenticated", () => {
		useSessionMock.mockReturnValue({
			isPending: false,
			data: { user: { name: "Alice", email: "alice@example.com" } },
		});

		render(<UserMenu />);

		expect(screen.getByText(/Olá, Alice/)).toBeInTheDocument();
	});

	it("signs out and navigates home on success", () => {
		useSessionMock.mockReturnValue({
			isPending: false,
			data: { user: { name: "Alice", email: "alice@example.com" } },
		});
		signOutMock.mockImplementation(({ fetchOptions }) =>
			fetchOptions.onSuccess(),
		);

		render(<UserMenu />);
		fireEvent.click(screen.getByText("Sair"));

		expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
	});

	it("shows the account link for the cliente role", () => {
		useSessionMock.mockReturnValue({
			isPending: false,
			data: {
				user: { name: "Alice", email: "alice@example.com", role: "cliente" },
			},
		});

		render(<UserMenu />);

		expect(screen.getByText("Minha Conta")).toBeInTheDocument();
	});

	it("shows the account link for the organizador role", () => {
		useSessionMock.mockReturnValue({
			isPending: false,
			data: {
				user: {
					name: "Alice",
					email: "alice@example.com",
					role: "organizador",
				},
			},
		});

		render(<UserMenu />);

		expect(screen.getByText("Minha Conta")).toBeInTheDocument();
	});

	it("shows only the sign out button for the portaria role", () => {
		useSessionMock.mockReturnValue({
			isPending: false,
			data: {
				user: {
					name: "Porteiro",
					email: "porteiro@example.com",
					role: "portaria",
				},
			},
		});

		render(<UserMenu />);

		expect(screen.queryByText("porteiro@example.com")).not.toBeInTheDocument();
		expect(screen.queryByText("Portaria")).not.toBeInTheDocument();
		expect(screen.getByText("Sair")).toBeInTheDocument();
	});
});
