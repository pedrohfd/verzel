import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockQueryChain } from "../test-helpers/mock-query-chain";

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }));

vi.mock("@verzel/db", () => ({
	db: { update: updateMock },
}));

const { registerCinema } = await import("./cinemas");

describe("registerCinema", () => {
	beforeEach(() => {
		updateMock.mockReset();
	});

	it("updates the user with the cinema fields and organizer role", async () => {
		const updatedUser = { id: "user-1", role: "organizador" };
		updateMock.mockReturnValue(mockQueryChain([updatedUser]));

		const result = await registerCinema("user-1", {
			cinemaName: "Cine Verzel",
			cnpj: "00.000.000/0000-00",
			zipCode: "00000-000",
			street: "Rua A",
			number: "10",
			neighborhood: "Centro",
			city: "São Paulo",
			state: "SP",
		});

		expect(updateMock).toHaveBeenCalled();
		expect(result).toEqual(updatedUser);
	});
});
