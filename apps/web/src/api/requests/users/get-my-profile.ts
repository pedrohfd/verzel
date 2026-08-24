import { apiClient } from "@/api/client";
import type { MyProfile } from "@/api/types";

export async function getMyProfile(signal?: AbortSignal) {
	const { data } = await apiClient.get<MyProfile>("/api/users/me", { signal });
	return data;
}
