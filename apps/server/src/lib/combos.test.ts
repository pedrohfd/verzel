import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import {
	DuplicateComboNameError,
	ForbiddenError,
	NotFoundError,
} from "./errors";

const { queryMock, insertMock, updateMock, deleteMock } = vi.hoisted(() => ({
	queryMock: {
		combos: { findMany: vi.fn(), findFirst: vi.fn() },
		events: { findFirst: vi.fn() },
	},
	insertMock: vi.fn(),
	updateMock: vi.fn(),
	deleteMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: {
		query: queryMock,
		insert: insertMock,
		update: updateMock,
		delete: deleteMock,
	},
}));

const {
	createCombo,
	listOrganizerCombos,
	getOwnedCombo,
	updateCombo,
	deleteCombo,
	listActiveCombosForEvent,
} = await import("./combos");

const baseCombo = {
	id: "combo-1",
	organizerId: "organizer-1",
	name: "Combo Casal",
	description: "Pipoca grande + 2 refrigerantes grandes",
	priceCents: 4490,
	active: true,
};

beforeEach(() => {
	queryMock.combos.findMany.mockReset();
	queryMock.combos.findFirst.mockReset();
	queryMock.events.findFirst.mockReset();
	insertMock.mockReset();
	updateMock.mockReset();
	deleteMock.mockReset();
});

describe("createCombo", () => {
	it("inserts the combo and returns it", async () => {
		queryMock.combos.findFirst.mockResolvedValue(undefined);
		insertMock.mockReturnValue(mockQueryChain([baseCombo]));

		const result = await createCombo({
			organizerId: "organizer-1",
			name: "Combo Casal",
			description: baseCombo.description,
			priceCents: 4490,
			active: true,
		});

		expect(result).toEqual([baseCombo]);
	});

	it("throws DuplicateComboNameError when the organizer already has a combo with that name", async () => {
		queryMock.combos.findFirst.mockResolvedValue(baseCombo);

		await expect(
			createCombo({
				organizerId: "organizer-1",
				name: "Combo Casal",
				description: null,
				priceCents: 4490,
				active: true,
			}),
		).rejects.toThrow(DuplicateComboNameError);
		expect(insertMock).not.toHaveBeenCalled();
	});
});

describe("listOrganizerCombos", () => {
	it("lists combos for the organizer", async () => {
		queryMock.combos.findMany.mockResolvedValue([baseCombo]);

		const result = await listOrganizerCombos("organizer-1");

		expect(result).toEqual([baseCombo]);
	});
});

describe("getOwnedCombo", () => {
	it("returns the combo when owned by the organizer", async () => {
		queryMock.combos.findFirst.mockResolvedValue(baseCombo);

		const result = await getOwnedCombo("combo-1", "organizer-1");

		expect(result).toEqual(baseCombo);
	});

	it("throws NotFoundError when the combo does not exist", async () => {
		queryMock.combos.findFirst.mockResolvedValue(undefined);

		await expect(getOwnedCombo("combo-1", "organizer-1")).rejects.toThrow(
			NotFoundError,
		);
	});

	it("throws ForbiddenError when the combo belongs to another organizer", async () => {
		queryMock.combos.findFirst.mockResolvedValue({
			...baseCombo,
			organizerId: "other-organizer",
		});

		await expect(getOwnedCombo("combo-1", "organizer-1")).rejects.toThrow(
			ForbiddenError,
		);
	});
});

describe("updateCombo", () => {
	it("updates the combo and returns it", async () => {
		queryMock.combos.findFirst.mockResolvedValue(undefined);
		updateMock.mockReturnValue(
			mockQueryChain([{ ...baseCombo, name: "Combo Casal Promo" }]),
		);

		const result = await updateCombo("combo-1", "organizer-1", {
			name: "Combo Casal Promo",
			description: baseCombo.description,
			priceCents: 3990,
			active: true,
		});

		expect(result).toEqual({ ...baseCombo, name: "Combo Casal Promo" });
	});

	it("throws DuplicateComboNameError when another combo already has that name", async () => {
		queryMock.combos.findFirst.mockResolvedValue({
			...baseCombo,
			id: "combo-2",
		});

		await expect(
			updateCombo("combo-1", "organizer-1", {
				name: "Combo Casal",
				description: null,
				priceCents: 4490,
				active: true,
			}),
		).rejects.toThrow(DuplicateComboNameError);
		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe("deleteCombo", () => {
	it("deletes the combo", async () => {
		deleteMock.mockReturnValue(mockQueryChain(undefined));

		await expect(deleteCombo("combo-1")).resolves.toBeUndefined();
		expect(deleteMock).toHaveBeenCalled();
	});
});

describe("listActiveCombosForEvent", () => {
	it("lists active combos for the event's organizer", async () => {
		queryMock.events.findFirst.mockResolvedValue({
			id: "event-1",
			organizerId: "organizer-1",
		});
		queryMock.combos.findMany.mockResolvedValue([baseCombo]);

		const result = await listActiveCombosForEvent("event-1");

		expect(result).toEqual([baseCombo]);
	});

	it("throws NotFoundError when the event does not exist", async () => {
		queryMock.events.findFirst.mockResolvedValue(undefined);

		await expect(listActiveCombosForEvent("event-1")).rejects.toThrow(
			NotFoundError,
		);
	});
});
