import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("./auth-client", () => ({
	authClient: { getSession: getSessionMock },
}));

vi.mock("@tanstack/react-router", () => ({
	redirect: (options: unknown) => {
		throw { isRedirect: true, options };
	},
}));

const { requireRole, redirectIfAuthenticated } = await import("./route-guards");

beforeEach(() => {
	getSessionMock.mockReset();
});

describe("requireRole", () => {
	it("redirects to /login when there is no session", async () => {
		getSessionMock.mockResolvedValue({ data: null });

		await expect(requireRole("cliente")).rejects.toMatchObject({
			isRedirect: true,
			options: { to: "/login" },
		});
	});

	it("redirects to /login when the user's role is not allowed", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "cliente" } },
		});

		await expect(requireRole("organizador")).rejects.toMatchObject({
			isRedirect: true,
			options: { to: "/login" },
		});
	});

	it("returns the session when the role is allowed", async () => {
		const session = { user: { role: "organizador" } };
		getSessionMock.mockResolvedValue({ data: session });

		await expect(requireRole("organizador")).resolves.toEqual(session);
	});
});

describe("redirectIfAuthenticated", () => {
	it("does not redirect when there is no session", async () => {
		getSessionMock.mockResolvedValue({ data: null });

		await expect(redirectIfAuthenticated()).resolves.toBeUndefined();
	});

	it("redirects to / when there is a session", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "cliente" } },
		});

		await expect(redirectIfAuthenticated()).rejects.toMatchObject({
			isRedirect: true,
			options: { to: "/" },
		});
	});
});
