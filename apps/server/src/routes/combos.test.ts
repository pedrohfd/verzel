import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError } from "../lib/errors";

const {
	createComboMock,
	listOrganizerCombosMock,
	listActiveCombosForEventMock,
	getOwnedComboMock,
	updateComboMock,
	deleteComboMock,
	requireRoleMock,
} = vi.hoisted(() => ({
	createComboMock: vi.fn(),
	listOrganizerCombosMock: vi.fn(),
	listActiveCombosForEventMock: vi.fn(),
	getOwnedComboMock: vi.fn(),
	updateComboMock: vi.fn(),
	deleteComboMock: vi.fn(),
	requireRoleMock: vi.fn(),
}));

vi.mock("../lib/combos", () => ({
	createCombo: createComboMock,
	listOrganizerCombos: listOrganizerCombosMock,
	listActiveCombosForEvent: listActiveCombosForEventMock,
	getOwnedCombo: getOwnedComboMock,
	updateCombo: updateComboMock,
	deleteCombo: deleteComboMock,
}));

vi.mock("../lib/require-role", () => ({
	requireRole: requireRoleMock,
}));

const { buildTestApp } = await import("../test-helpers/build-test-app");

const validCreateBody = {
	name: "Combo Casal",
	description: "Pipoca grande + 2 refrigerantes grandes",
	priceCents: 4490,
};

function authAsOrganizer(userId = "organizer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "organizador" };
		},
	);
}

function authAsCustomer(userId = "customer-1") {
	requireRoleMock.mockReturnValue(
		async (request: { user?: { id: string; role: string } }) => {
			request.user = { id: userId, role: "cliente" };
		},
	);
}

beforeEach(() => {
	for (const mock of [
		createComboMock,
		listOrganizerCombosMock,
		listActiveCombosForEventMock,
		getOwnedComboMock,
		updateComboMock,
		deleteComboMock,
		requireRoleMock,
	]) {
		mock.mockReset();
	}
});

describe("GET /mine", () => {
	it("lists the organizer's own combos", async () => {
		authAsOrganizer();
		listOrganizerCombosMock.mockResolvedValue([{ id: "combo-1" }]);
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/combos/mine" });

		expect(res.json()).toEqual({ results: [{ id: "combo-1" }] });
		expect(listOrganizerCombosMock).toHaveBeenCalledWith("organizer-1");
	});
});

describe("GET /for-event/:eventId", () => {
	it("lists active combos available for the event", async () => {
		authAsCustomer();
		listActiveCombosForEventMock.mockResolvedValue([{ id: "combo-1" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/combos/for-event/event-1",
		});

		expect(res.json()).toEqual({ results: [{ id: "combo-1" }] });
		expect(listActiveCombosForEventMock).toHaveBeenCalledWith("event-1");
	});
});

describe("POST /", () => {
	it("returns 400 for an invalid payload", async () => {
		authAsOrganizer();
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/combos",
			payload: {},
		});

		expect(res.statusCode).toBe(400);
	});

	it("creates the combo and returns 201", async () => {
		authAsOrganizer();
		createComboMock.mockResolvedValue([
			{ id: "combo-1", organizerId: "organizer-1", ...validCreateBody },
		]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/combos",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(201);
		expect(res.json()).toMatchObject({ id: "combo-1", name: "Combo Casal" });
		expect(createComboMock).toHaveBeenCalledWith(
			expect.objectContaining({
				organizerId: "organizer-1",
				name: "Combo Casal",
				active: true,
			}),
		);
	});

	it("forwards domain errors from createCombo", async () => {
		authAsOrganizer();
		createComboMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "POST",
			url: "/api/combos",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(403);
	});
});

describe("PATCH /:id", () => {
	it("updates the combo and returns it", async () => {
		authAsOrganizer();
		getOwnedComboMock.mockResolvedValue({
			id: "combo-1",
			organizerId: "organizer-1",
			...validCreateBody,
		});
		updateComboMock.mockResolvedValue({
			id: "combo-1",
			organizerId: "organizer-1",
			name: "Combo Casal Promo",
			description: validCreateBody.description,
			priceCents: 3990,
			active: true,
		});
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/combos/combo-1",
			payload: {
				...validCreateBody,
				name: "Combo Casal Promo",
				priceCents: 3990,
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toMatchObject({ name: "Combo Casal Promo" });
		expect(getOwnedComboMock).toHaveBeenCalledWith("combo-1", "organizer-1");
	});

	it("returns 404 when the combo does not exist", async () => {
		authAsOrganizer();
		getOwnedComboMock.mockRejectedValue(new NotFoundError("Combo"));
		const app = buildTestApp();

		const res = await app.inject({
			method: "PATCH",
			url: "/api/combos/combo-1",
			payload: validCreateBody,
		});

		expect(res.statusCode).toBe(404);
	});
});

describe("DELETE /:id", () => {
	it("deletes the combo and returns 204", async () => {
		authAsOrganizer();
		getOwnedComboMock.mockResolvedValue({
			id: "combo-1",
			organizerId: "organizer-1",
			...validCreateBody,
		});
		deleteComboMock.mockResolvedValue(undefined);
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/combos/combo-1",
		});

		expect(res.statusCode).toBe(204);
		expect(deleteComboMock).toHaveBeenCalledWith("combo-1");
	});

	it("returns 403 when the combo belongs to another organizer", async () => {
		authAsOrganizer();
		getOwnedComboMock.mockRejectedValue(new ForbiddenError());
		const app = buildTestApp();

		const res = await app.inject({
			method: "DELETE",
			url: "/api/combos/combo-1",
		});

		expect(res.statusCode).toBe(403);
	});
});
