import { apiClient } from "@/api/client";

export interface CreateGatekeeperInput {
	name: string;
	email: string;
	password: string;
}

export async function createGatekeeper(input: CreateGatekeeperInput) {
	const { data } = await apiClient.post("/api/gatekeepers", input);
	return data;
}
