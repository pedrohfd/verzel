import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
	useNavigate: () => vi.fn(),
}));

const useSession = vi.fn<
	() => { isPending: boolean; data: { user: { role: string } } | null }
>(() => ({ isPending: false, data: null }));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => useSession(),
		signOut: vi.fn(),
	},
}));

vi.mock("@/api/requests/events/get-published-events", () => ({
	getPublishedEvents: vi.fn(),
}));

const { default: Header } = await import("./header");

describe("Header", () => {
	afterEach(() => {
		useSession.mockReturnValue({ isPending: false, data: null });
	});

	it("renders the brand link and search", () => {
		render(<Header />);

		expect(screen.getByText("Ticket")).toBeInTheDocument();
		expect(screen.getByText("Buscar sessão...")).toBeInTheDocument();
	});

	it("hides the search field for the portaria role", () => {
		useSession.mockReturnValue({
			isPending: false,
			data: { user: { role: "portaria" } },
		});

		render(<Header />);

		expect(screen.getByText("Ticket")).toBeInTheDocument();
		expect(screen.queryByText("Buscar sessão...")).not.toBeInTheDocument();
	});
});
