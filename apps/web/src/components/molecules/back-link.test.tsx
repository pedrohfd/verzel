import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
const back = vi.fn();
let canGoBack = false;

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		children,
		className,
		onClick,
	}: {
		to: string;
		children: React.ReactNode;
		className?: string;
		onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
	}) => (
		<a href={to} className={className} onClick={onClick}>
			{children}
		</a>
	),
	useRouter: () => ({
		navigate,
		history: {
			canGoBack: () => canGoBack,
			back,
		},
	}),
}));

const { default: BackLink } = await import("./back-link");

describe("BackLink", () => {
	beforeEach(() => {
		navigate.mockClear();
		back.mockClear();
	});

	it("renders the label and links to the given route", () => {
		render(<BackLink to="/organizer" label="Minhas sessões" />);

		const link = screen.getByRole("link", { name: /minhas sessões/i });
		expect(link).toHaveAttribute("href", "/organizer");
	});

	it("navigates to the fallback route when there is no in-app history", () => {
		canGoBack = false;
		render(<BackLink to="/organizer" label="Minhas sessões" />);

		fireEvent.click(screen.getByRole("link", { name: /minhas sessões/i }));

		expect(navigate).toHaveBeenCalledWith({ to: "/organizer" });
		expect(back).not.toHaveBeenCalled();
	});

	it("goes back in history when in-app history is available", () => {
		canGoBack = true;
		render(<BackLink to="/organizer" label="Minhas sessões" />);

		fireEvent.click(screen.getByRole("link", { name: /minhas sessões/i }));

		expect(back).toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});
});
