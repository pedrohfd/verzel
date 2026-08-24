import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getPublishedEventsMock, navigateMock } = vi.hoisted(() => ({
	getPublishedEventsMock: vi.fn(),
	navigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateMock,
}));

vi.mock("@/api/requests/events/get-published-events", () => ({
	getPublishedEvents: getPublishedEventsMock,
}));

vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({ isPending: false, data: null }),
	},
}));

vi.mock("@verzel/ui/components/command", () => ({
	CommandDialog: ({
		open,
		children,
	}: {
		open: boolean;
		children: React.ReactNode;
	}) => (open ? <div>{children}</div> : null),
	CommandInput: ({
		value,
		onValueChange,
		onKeyDown,
	}: {
		value: string;
		onValueChange: (value: string) => void;
		onKeyDown: (event: React.KeyboardEvent) => void;
	}) => (
		<input
			aria-label="search input"
			value={value}
			onChange={(e) => onValueChange(e.target.value)}
			onKeyDown={onKeyDown}
		/>
	),
	CommandList: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	CommandEmpty: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	CommandGroup: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	CommandItem: ({
		children,
		onSelect,
	}: {
		children: React.ReactNode;
		onSelect: () => void;
	}) => (
		<button type="button" onClick={onSelect}>
			{children}
		</button>
	),
}));

const { default: SearchCommand } = await import("./search-command");

beforeEach(() => {
	getPublishedEventsMock.mockReset();
	navigateMock.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

async function openAndSearch(query: string) {
	fireEvent.click(screen.getByText("Buscar sessão..."));
	fireEvent.change(screen.getByLabelText("search input"), {
		target: { value: query },
	});
	await act(async () => {
		vi.advanceTimersByTime(300);
	});
}

describe("SearchCommand", () => {
	it("opens the dialog when the trigger button is clicked", () => {
		render(<SearchCommand />);

		fireEvent.click(screen.getByText("Buscar sessão..."));

		expect(screen.getByLabelText("search input")).toBeInTheDocument();
	});

	it("shows results after the debounced search resolves", async () => {
		getPublishedEventsMock.mockResolvedValue([
			{
				id: "1",
				tmdbMovieId: 1,
				movieTitle: "Matrix",
				venueName: "Venue",
				moviePosterPath: null,
			},
		]);
		render(<SearchCommand />);

		await openAndSearch("matrix");

		expect(screen.getByText("Matrix")).toBeInTheDocument();
	});

	it("shows an empty state when no results are found", async () => {
		getPublishedEventsMock.mockResolvedValue([]);
		render(<SearchCommand />);

		await openAndSearch("nomatch");

		expect(screen.getByText("Nenhuma sessão encontrada.")).toBeInTheDocument();
	});

	it("navigates to the event when a result is selected", async () => {
		getPublishedEventsMock.mockResolvedValue([
			{
				id: "1",
				tmdbMovieId: 1,
				movieTitle: "Matrix",
				venueName: "Venue",
				moviePosterPath: null,
			},
		]);
		render(<SearchCommand />);

		await openAndSearch("matrix");
		fireEvent.click(screen.getByText("Matrix"));

		expect(navigateMock).toHaveBeenCalledWith({
			to: "/events/$eventId",
			params: { eventId: "1" },
		});
	});

	it("navigates to the search page when Enter is pressed", async () => {
		getPublishedEventsMock.mockResolvedValue([]);
		render(<SearchCommand />);

		fireEvent.click(screen.getByText("Buscar sessão..."));
		fireEvent.change(screen.getByLabelText("search input"), {
			target: { value: "matrix" },
		});
		fireEvent.keyDown(screen.getByLabelText("search input"), { key: "Enter" });

		expect(navigateMock).toHaveBeenCalledWith({
			to: "/search",
			search: { q: "matrix" },
		});
	});
});
