import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailAlreadyInUseError, NotFoundError } from "../lib/errors";

const {
	registerGatekeeperMock,
	listOrganizerGatekeepersMock,
	deleteGatekeeperMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	registerGatekeeperMock: vi.fn(),
	listOrganizerGatekeepersMock: vi.fn(),
	deleteGatekeeperMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/gatekeepers", () => ({
	registerGatekeeper: registerGatekeeperMock,
	listOrganizerGatekeepers: listOrganizerGatekeepersMock,
	deleteGatekeeper: deleteGatekeeperMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validBody = {
	name: "Porteiro Um",
	email: "porteiro@example.com",
	password: "password123",
};

function authAsOrganizer(userId = "organizer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "organizador" };
		},
	);
}

function authAsUnauthenticated() {
	requireRoleMock.mockReturnValue(
		async (
			_request: unknown,
			reply: { status: (code: number) => { send: (body: unknown) => unknown } },
		) =>
			reply
				.status(401)
				.send({ error: "Authentication required", code: "UNAUTHENTICATED" }),
	);
}

function authAsForbidden() {
	requireRoleMock.mockReturnValue(
		async (
			_request: unknown,
			reply: { status: (code: number) => { send: (body: unknown) => unknown } },
		) =>
			reply.status(403).send({
				error: "You do not have access to this resource",
				code: "FORBIDDEN",
			}),
	);
}

beforeEach(() => {
	registerGatekeeperMock.mockReset();
	listOrganizerGatekeepersMock.mockReset();
	deleteGatekeeperMock.mockReset();
	requireRoleMock.mockReset();
});

describe("POST /", () => {
	it("returns 401 when there is no session", async () => {
		authAsUnauthenticated();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/gatekeepers",
			payload: validBody,
		});

		expect(res.statusCode).toBe(401);
	});

	it("returns 403 when the caller is not an organizer", async () => {
		authAsForbidden();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/gatekeepers",
			payload: validBody,
		});

		expect(res.statusCode).toBe(403);
	});

	it("returns 400 for an invalid payload", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/gatekeepers",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("creates the gatekeeper and returns 201", async () => {
		authAsOrganizer();
		registerGatekeeperMock.mockResolvedValue({
			id: "user-1",
			name: "Porteiro Um",
			email: "porteiro@example.com",
			role: "portaria",
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/gatekeepers",
			payload: validBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toMatchObject({ id: "user-1", role: "portaria" });
		expect(registerGatekeeperMock).toHaveBeenCalledWith({
			...validBody,
			organizerId: "organizer-1",
		});
	});

	it("returns 409 when the email is already in use", async () => {
		authAsOrganizer();
		registerGatekeeperMock.mockRejectedValue(new EmailAlreadyInUseError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/gatekeepers",
			payload: validBody,
		});

		expect(res.statusCode).toBe(409);
	});
});

describe("GET /mine", () => {
	it("returns 401 when there is no session", async () => {
		authAsUnauthenticated();
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/gatekeepers/mine",
		});

		expect(res.statusCode).toBe(401);
	});

	it("returns 403 when the caller is not an organizer", async () => {
		authAsForbidden();
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/gatekeepers/mine",
		});

		expect(res.statusCode).toBe(403);
	});

	it("returns the organizer's gatekeepers", async () => {
		authAsOrganizer();
		listOrganizerGatekeepersMock.mockResolvedValue([
			{ id: "user-1", name: "Porteiro Um", email: "porteiro@example.com" },
		]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/gatekeepers/mine",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			results: [
				{ id: "user-1", name: "Porteiro Um", email: "porteiro@example.com" },
			],
		});
		expect(listOrganizerGatekeepersMock).toHaveBeenCalledWith("organizer-1");
	});
});

describe("DELETE /:id", () => {
	it("returns 401 when there is no session", async () => {
		authAsUnauthenticated();
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/gatekeepers/user-1",
		});

		expect(res.statusCode).toBe(401);
	});

	it("returns 403 when the caller is not an organizer", async () => {
		authAsForbidden();
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/gatekeepers/user-1",
		});

		expect(res.statusCode).toBe(403);
	});

	it("returns 404 when the gatekeeper was not created by this organizer", async () => {
		authAsOrganizer();
		deleteGatekeeperMock.mockRejectedValue(new NotFoundError("Gatekeeper"));
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/gatekeepers/user-1",
		});

		expect(res.statusCode).toBe(404);
	});

	it("deletes the gatekeeper and returns 204", async () => {
		authAsOrganizer();
		deleteGatekeeperMock.mockResolvedValue(undefined);
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/gatekeepers/user-1",
		});

		expect(res.statusCode).toBe(204);
		expect(deleteGatekeeperMock).toHaveBeenCalledWith("user-1", "organizer-1");
	});
});
