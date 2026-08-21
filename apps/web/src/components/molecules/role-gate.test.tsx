import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

vi.mock("@/lib/auth-client", () => ({
	authClient: { useSession: useSessionMock },
}));

const { default: RoleGate } = await import("./role-gate");

describe("RoleGate", () => {
	it("renders children when the session role matches", () => {
		useSessionMock.mockReturnValue({
			data: { user: { role: "organizador" } },
		});

		render(
			// biome-ignore lint/a11y/useValidAriaRole: RoleGate role prop is not an ARIA role
			<RoleGate role="organizador">
				<span>protected content</span>
			</RoleGate>,
		);

		expect(screen.getByText("protected content")).toBeInTheDocument();
	});

	it("renders nothing when the session role does not match", () => {
		useSessionMock.mockReturnValue({ data: { user: { role: "cliente" } } });

		render(
			// biome-ignore lint/a11y/useValidAriaRole: RoleGate role prop is not an ARIA role
			<RoleGate role="organizador">
				<span>protected content</span>
			</RoleGate>,
		);

		expect(screen.queryByText("protected content")).not.toBeInTheDocument();
	});

	it("renders nothing when there is no session", () => {
		useSessionMock.mockReturnValue({ data: null });

		render(
			// biome-ignore lint/a11y/useValidAriaRole: RoleGate role prop is not an ARIA role
			<RoleGate role="organizador">
				<span>protected content</span>
			</RoleGate>,
		);

		expect(screen.queryByText("protected content")).not.toBeInTheDocument();
	});
});
