import { apiClient } from "@/api/client";
import type { MyPurchase } from "@/api/types";

export async function getMyPurchases(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: MyPurchase[] }>(
		"/api/purchases/mine",
		{ signal },
	);
	return data.results;
}
