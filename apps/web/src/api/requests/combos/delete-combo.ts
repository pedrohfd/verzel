import { apiClient } from "@/api/client";

export async function deleteCombo(comboId: string) {
	await apiClient.delete(`/api/combos/${comboId}`);
}
