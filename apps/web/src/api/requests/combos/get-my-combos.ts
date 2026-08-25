import { apiClient } from "@/api/client";
import type { Combo } from "@/api/types";

export async function getMyCombos(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: Combo[] }>(
		"/api/combos/mine",
		{ signal },
	);
	return data.results;
}
