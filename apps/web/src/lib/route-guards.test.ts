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

const { requireRole, redirectIfAuthenticated, restrictPortariaAccess } =
	await import("./route-guards");

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

describe("restrictPortariaAccess", () => {
	it("does not redirect when there is no session", async () => {
		getSessionMock.mockResolvedValue({ data: null });

		await expect(restrictPortariaAccess("/")).resolves.toBeUndefined();
	});

	it("does not redirect non-portaria roles", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "cliente" } },
		});

		await expect(
			restrictPortariaAccess("/organizer/dashboard"),
		).resolves.toBeUndefined();
	});

	it("does not redirect portaria users already on /portaria", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "portaria" } },
		});

		await expect(restrictPortariaAccess("/portaria")).resolves.toBeUndefined();
	});

	it("does not redirect portaria users on nested /portaria/:eventId", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "portaria" } },
		});

		await expect(
			restrictPortariaAccess("/portaria/abc123"),
		).resolves.toBeUndefined();
	});

	it("redirects portaria users away from other routes", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "portaria" } },
		});

		await expect(restrictPortariaAccess("/")).rejects.toMatchObject({
			isRedirect: true,
			options: { to: "/portaria" },
		});
	});

	it("redirects portaria users away from /login", async () => {
		getSessionMock.mockResolvedValue({
			data: { user: { role: "portaria" } },
		});

		await expect(restrictPortariaAccess("/login")).rejects.toMatchObject({
			isRedirect: true,
			options: { to: "/portaria" },
		});
	});
});
