import { apiClient } from "@/api/client";

export async function deleteGatekeeper(gatekeeperId: string) {
	await apiClient.delete(`/api/gatekeepers/${gatekeeperId}`);
}
