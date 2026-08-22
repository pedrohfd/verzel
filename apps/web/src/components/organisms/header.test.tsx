import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
	useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({ isPending: false, data: null }),
		signOut: vi.fn(),
	},
}));

vi.mock("@/api/requests/events/get-published-events", () => ({
	getPublishedEvents: vi.fn(),
}));

const { default: Header } = await import("./header");

describe("Header", () => {
	it("renders the brand link and search", () => {
		render(<Header />);

		expect(screen.getByText("Ticket")).toBeInTheDocument();
		expect(screen.getByText("Buscar sessão...")).toBeInTheDocument();
	});
});
