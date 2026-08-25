import { apiClient } from "@/api/client";
import type { Combo } from "@/api/types";
import type { CreateComboInput } from "./create-combo";

export async function updateCombo(comboId: string, input: CreateComboInput) {
	const { data } = await apiClient.patch<Combo>(
		`/api/combos/${comboId}`,
		input,
	);
	return data;
}
