import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import { EmailAlreadyInUseError } from "./errors";

const { queryMock, selectMock, updateMock } = vi.hoisted(() => ({
	queryMock: {
		user: { findFirst: vi.fn() },
	},
	selectMock: vi.fn(),
	updateMock: vi.fn(),
}));

vi.mock("@verzel/db", () => ({
	db: {
		query: queryMock,
		select: selectMock,
		update: updateMock,
	},
}));

const { getUserProfile, updateUserProfile } = await import("./users");

const baseProfile = {
	id: "user-1",
	name: "Jane Doe",
	email: "jane@example.com",
	role: "cliente",
	cinemaName: null,
	cnpj: null,
	zipCode: null,
	street: null,
	number: null,
	complement: null,
	neighborhood: null,
	city: null,
	state: null,
};

beforeEach(() => {
	queryMock.user.findFirst.mockReset();
	selectMock.mockReset();
	updateMock.mockReset();
});

describe("getUserProfile", () => {
	it("returns the user profile", async () => {
		selectMock.mockReturnValue(mockQueryChain([baseProfile]));

		const result = await getUserProfile("user-1");

		expect(result).toEqual(baseProfile);
	});
});

describe("updateUserProfile", () => {
	it("updates only name and email for cliente", async () => {
		queryMock.user.findFirst.mockResolvedValue(baseProfile);
		updateMock.mockReturnValue(
			mockQueryChain([{ ...baseProfile, name: "New Name" }]),
		);

		const result = await updateUserProfile("user-1", "cliente", {
			name: "New Name",
			email: "jane@example.com",
		});

		expect(result?.name).toBe("New Name");
		expect(updateMock).toHaveBeenCalled();
	});

	it("updates cinema fields for organizador", async () => {
		const organizerProfile = { ...baseProfile, role: "organizador" };
		queryMock.user.findFirst.mockResolvedValue(organizerProfile);
		updateMock.mockReturnValue(
			mockQueryChain([{ ...organizerProfile, cinemaName: "Cine Verzel" }]),
		);

		const result = await updateUserProfile("user-1", "organizador", {
			name: "Jane Doe",
			email: "jane@example.com",
			cinemaName: "Cine Verzel",
			cnpj: "11222333000181",
			zipCode: "00000000",
			street: "Rua A",
			number: "10",
			neighborhood: "Centro",
			city: "São Paulo",
			state: "SP",
		});

		expect(result?.cinemaName).toBe("Cine Verzel");
	});

	it("throws EmailAlreadyInUseError when another user already has the email", async () => {
		queryMock.user.findFirst.mockResolvedValue({
			...baseProfile,
			id: "user-2",
		});

		await expect(
			updateUserProfile("user-1", "cliente", {
				name: "Jane Doe",
				email: "taken@example.com",
			}),
		).rejects.toThrow(EmailAlreadyInUseError);

		expect(updateMock).not.toHaveBeenCalled();
	});

	it("allows keeping the user's own email", async () => {
		queryMock.user.findFirst.mockResolvedValue(baseProfile);
		updateMock.mockReturnValue(mockQueryChain([baseProfile]));

		await expect(
			updateUserProfile("user-1", "cliente", {
				name: "Jane Doe",
				email: "jane@example.com",
			}),
		).resolves.toEqual(baseProfile);
	});
});
