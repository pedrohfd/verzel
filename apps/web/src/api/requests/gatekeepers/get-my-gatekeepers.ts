import { apiClient } from "@/api/client";
import type { Gatekeeper } from "@/api/types";

export async function getMyGatekeepers(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: Gatekeeper[] }>(
		"/api/gatekeepers/mine",
		{ signal },
	);
	return data.results;
}
