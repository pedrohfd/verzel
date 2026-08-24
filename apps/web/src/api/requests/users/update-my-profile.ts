import { apiClient } from "@/api/client";
import type { MyProfile } from "@/api/types";

export interface UpdateMyProfileInput {
	name: string;
	email: string;
	cinemaName?: string;
	cnpj?: string;
	zipCode?: string;
	street?: string;
	number?: string;
	complement?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
}

export async function updateMyProfile(input: UpdateMyProfileInput) {
	const { data } = await apiClient.patch<MyProfile>("/api/users/me", input);
	return data;
}
