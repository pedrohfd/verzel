import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerCinemaMock, getSessionUserMock } = vi.hoisted(() => ({
	registerCinemaMock: vi.fn(),
	getSessionUserMock: vi.fn(),
}));

vi.mock("../lib/cinemas", () => ({ registerCinema: registerCinemaMock }));
vi.mock("../lib/require-role", () => ({
	getSessionUser: getSessionUserMock,
	requireRole: vi.fn(),
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validBody = {
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
	registerCinemaMock.mockReset();
	getSessionUserMock.mockReset();
});

const createApp = buildTestApp;

describe("POST /register", () => {
	it("returns 401 when there is no authenticated user", async () => {
		getSessionUserMock.mockResolvedValue(null);
		const app = createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/cinemas/register",
			payload: validBody,
		});

		expect(res.statusCode).toBe(401);
	});

	it("returns 400 when the payload is invalid", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		const app = createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/cinemas/register",
			payload: { cinemaName: "" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when the CNPJ checksum is invalid", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		const app = createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/cinemas/register",
			payload: { ...validBody, cnpj: "00.000.000/0000-00" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns the updated user on success", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		registerCinemaMock.mockResolvedValue({ id: "user-1", role: "organizador" });
		const app = createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/cinemas/register",
			payload: validBody,
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ id: "user-1", role: "organizador" });
		expect(registerCinemaMock).toHaveBeenCalledWith(
			"user-1",
			expect.objectContaining({ cnpj: "11222333000181", zipCode: "00000000" }),
		);
	});

	it("forwards domain errors via sendDomainError", async () => {
		getSessionUserMock.mockResolvedValue({ id: "user-1", role: "cliente" });
		registerCinemaMock.mockRejectedValue(new Error("boom"));
		const app = createApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/cinemas/register",
			payload: validBody,
		});

		expect(res.statusCode).toBe(500);
	});
});
