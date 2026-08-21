import { beforeEach, describe, expect, it, vi } from "vitest";

const { authHandlerMock } = vi.hoisted(() => ({ authHandlerMock: vi.fn() }));

vi.mock("@verzel/auth", () => ({
	auth: { handler: authHandlerMock },
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

beforeEach(() => {
	authHandlerMock.mockReset();
});

describe("GET/POST /api/auth/*", () => {
	it("proxies the response from better-auth's handler", async () => {
		authHandlerMock.mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/auth/session",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ ok: true });
	});

	it("returns 500 when the handler throws", async () => {
		authHandlerMock.mockRejectedValue(new Error("boom"));
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/auth/session",
		});

		expect(res.statusCode).toBe(500);
		expect(res.json()).toEqual({
			error: "Internal authentication error",
			code: "AUTH_FAILURE",
		});
	});
});
