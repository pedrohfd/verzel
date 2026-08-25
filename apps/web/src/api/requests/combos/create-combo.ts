import { apiClient } from "@/api/client";
import type { Combo } from "@/api/types";

export interface CreateComboInput {
	name: string;
	description: string | null;
	priceCents: number;
	active: boolean;
}

export async function createCombo(input: CreateComboInput) {
	const { data } = await apiClient.post<Combo>("/api/combos", input);
	return data;
}
