import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryChain } from "../test-helpers/mock-query-chain";
import { EmailAlreadyInUseError, NotFoundError } from "./errors";

const { signUpEmailMock, updateMock, findManyMock, findFirstMock, deleteMock } =
	vi.hoisted(() => ({
		signUpEmailMock: vi.fn(),
		updateMock: vi.fn(),
		findManyMock: vi.fn(),
		findFirstMock: vi.fn(),
		deleteMock: vi.fn(),
	}));

vi.mock("@verzel/auth", () => ({
	auth: { api: { signUpEmail: signUpEmailMock } },
}));

vi.mock("@verzel/db", () => ({
	db: {
		update: updateMock,
		query: { user: { findMany: findManyMock, findFirst: findFirstMock } },
		delete: deleteMock,
	},
}));

const { registerGatekeeper, listOrganizerGatekeepers, deleteGatekeeper } =
	await import("./gatekeepers");

beforeEach(() => {
	signUpEmailMock.mockReset();
	updateMock.mockReset();
	findManyMock.mockReset();
	findFirstMock.mockReset();
	deleteMock.mockReset();
});

const input = {
	organizerId: "organizer-1",
	name: "Porteiro Um",
	email: "porteiro@example.com",
	password: "password123",
};

describe("registerGatekeeper", () => {
	it("signs up the user and promotes it to the portaria role", async () => {
		signUpEmailMock.mockResolvedValue({ user: { id: "user-1" } });
		const gatekeeper = {
			id: "user-1",
			role: "portaria",
			createdBy: "organizer-1",
		};
		updateMock.mockReturnValue(mockQueryChain([gatekeeper]));

		const result = await registerGatekeeper(input);

		expect(signUpEmailMock).toHaveBeenCalledWith({
			body: {
				name: input.name,
				email: input.email,
				password: input.password,
			},
		});
		expect(updateMock).toHaveBeenCalled();
		expect(result).toEqual(gatekeeper);
	});

	it("throws EmailAlreadyInUseError when sign up rejects with an APIError", async () => {
		signUpEmailMock.mockRejectedValue(new APIError("UNPROCESSABLE_ENTITY"));

		await expect(registerGatekeeper(input)).rejects.toBeInstanceOf(
			EmailAlreadyInUseError,
		);
		expect(updateMock).not.toHaveBeenCalled();
	});

	it("rethrows unexpected errors from sign up", async () => {
		const unexpected = new Error("network down");
		signUpEmailMock.mockRejectedValue(unexpected);

		await expect(registerGatekeeper(input)).rejects.toBe(unexpected);
		expect(updateMock).not.toHaveBeenCalled();
	});
});

describe("listOrganizerGatekeepers", () => {
	it("lists the gatekeepers created by the given organizer", async () => {
		const gatekeepers = [
			{ id: "user-1", name: "Porteiro Um", email: "porteiro@example.com" },
		];
		findManyMock.mockResolvedValue(gatekeepers);

		const result = await listOrganizerGatekeepers("organizer-1");

		expect(findManyMock).toHaveBeenCalled();
		expect(result).toEqual(gatekeepers);
	});
});

describe("deleteGatekeeper", () => {
	it("throws NotFoundError when the gatekeeper does not belong to the organizer", async () => {
		findFirstMock.mockResolvedValue(undefined);

		await expect(
			deleteGatekeeper("user-1", "organizer-1"),
		).rejects.toBeInstanceOf(NotFoundError);
		expect(deleteMock).not.toHaveBeenCalled();
	});

	it("deletes the gatekeeper when it belongs to the organizer", async () => {
		findFirstMock.mockResolvedValue({ id: "user-1", role: "portaria" });
		deleteMock.mockReturnValue(mockQueryChain(undefined));

		await deleteGatekeeper("user-1", "organizer-1");

		expect(deleteMock).toHaveBeenCalled();
	});
});
