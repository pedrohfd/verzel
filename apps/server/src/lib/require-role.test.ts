import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock("@verzel/auth", () => ({
	auth: { api: { getSession: getSessionMock } },
}));

const { getSessionUser, requireRole } = await import("./require-role");

function createRequest(headers: Record<string, string> = {}) {
	return { headers } as import("fastify").FastifyRequest;
}

function createMockReply() {
	const reply = { status: vi.fn(), send: vi.fn() };
	reply.status.mockReturnValue(reply);
	reply.send.mockReturnValue(reply);
	return reply as unknown as import("fastify").FastifyReply & {
		status: ReturnType<typeof vi.fn>;
		send: ReturnType<typeof vi.fn>;
	};
}

beforeEach(() => {
	getSessionMock.mockReset();
});

describe("getSessionUser", () => {
	it("returns null when there is no session", async () => {
		getSessionMock.mockResolvedValue(null);

		await expect(getSessionUser(createRequest())).resolves.toBeNull();
	});

	it("returns the session user when present", async () => {
		const user = { id: "user-1", role: "cliente" };
		getSessionMock.mockResolvedValue({ user });

		await expect(getSessionUser(createRequest())).resolves.toEqual(user);
	});
});

describe("requireRole", () => {
	it("responds 401 when there is no session", async () => {
		getSessionMock.mockResolvedValue(null);
		const reply = createMockReply();

		await requireRole("organizador")(createRequest(), reply);

		expect(reply.status).toHaveBeenCalledWith(401);
	});

	it("responds 403 when the user's role is not allowed", async () => {
		getSessionMock.mockResolvedValue({
			user: { id: "user-1", role: "cliente" },
		});
		const reply = createMockReply();

		await requireRole("organizador")(createRequest(), reply);

		expect(reply.status).toHaveBeenCalledWith(403);
	});

	it("attaches the user to the request when the role matches", async () => {
		const user = { id: "user-1", role: "organizador" };
		getSessionMock.mockResolvedValue({ user });
		const reply = createMockReply();
		const request = createRequest();

		await requireRole("organizador")(request, reply);

		expect(request.user).toEqual(user);
		expect(reply.status).not.toHaveBeenCalled();
	});
});
