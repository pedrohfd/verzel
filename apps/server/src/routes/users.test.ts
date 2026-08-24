import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAlreadyInUseError } from "../lib/errors";

const { getUserProfileMock, updateUserProfileMock, getSessionUserMock } =
	vi.hoisted(() => ({
		getUserProfileMock: vi.fn(),
		updateUserProfileMock: vi.fn(),
		getSessionUserMock: vi.fn(),
	}));

vi.mock("../lib/users", () => ({
	getUserProfile: getUserProfileMock,
	updateUserProfile: updateUserProfileMock,
}));

vi.mock("../lib/require-role", () => ({
	getSessionUser: getSessionUserMock,
	requireRole: vi.fn(),
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const clientBody = { name: "Jane Doe", email: "jane@example.com" };

const organizerBody = {
	name: "Jane Doe",
	email: "jane@example.com",
	cinemaName: "Cine Verzel",
	cnpj: "11.222.333/0001-81",
	zipCode: "00000-000",
	street: "Rua A",
	number: "10",
	neighborhood: "Centro",
	city: "São Paulo",
	state: "SP",
};

beforeEach(() => {
	getUserProfileMock.mockReset();
	updateUserProfileMock.mockReset();
	getSessionUserMock.mockReset();
});

describe("GET /me", () => {
	it("returns 401 when there is no authenticated user", async () => {
		getSessionUserMock.mockResolvedValue(null);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/users/me" });

		expect(res.statusCode).toBe(401);
	});

	it("returns the profile for an authenticated user", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		getUserProfileMock.mockResolvedValue({ id: "user-1", name: "Jane Doe" });
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/users/me" });

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ id: "user-1", name: "Jane Doe" });
	});
});

describe("PATCH /me", () => {
	it("returns 401 when there is no authenticated user", async () => {
		getSessionUserMock.mockResolvedValue(null);
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/users/me",
			payload: clientBody,
		});

		expect(res.statusCode).toBe(401);
	});

	it("updates a cliente with name and email only", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		updateUserProfileMock.mockResolvedValue({ id: "user-1", ...clientBody });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/users/me",
			payload: clientBody,
		});

		expect(res.statusCode).toBe(200);
		expect(updateUserProfileMock).toHaveBeenCalledWith(
			"user-1",
			"cliente",
			clientBody,
		);
	});

	it("updates an organizador including cinema data", async () => {
		getSessionUserMock.mockResolvedValue({
			id: "user-1",
			role: "organizador",
		});
		updateUserProfileMock.mockResolvedValue({ id: "user-1" });
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/users/me",
			payload: organizerBody,
		});

		expect(res.statusCode).toBe(200);
		expect(updateUserProfileMock).toHaveBeenCalledWith(
			"user-1",
			"organizador",
			expect.objectContaining({ cnpj: "11222333000181", zipCode: "00000000" }),
		);
	});

	it("returns 400 when organizador payload is missing cinema fields", async () => {
		getSessionUserMock.mockResolvedValue({
			id: "user-1",
			role: "organizador",
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/users/me",
			payload: clientBody,
		});

		expect(res.statusCode).toBe(400);
		expect(updateUserProfileMock).not.toHaveBeenCalled();
	});

	it("returns 409 when the email is already in use", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		updateUserProfileMock.mockImplementation(() => {
			throw new EmailAlreadyInUseError();
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/users/me",
			payload: clientBody,
		});

		expect(res.statusCode).toBe(409);
		expect(res.json().code).toBe("EMAIL_ALREADY_IN_USE");
	});
});
