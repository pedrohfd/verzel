import { apiClient } from "@/api/client";

export interface RegisterCinemaInput {
	cinemaName: string;
	cnpj: string;
	zipCode: string;
	street: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
}

export async function registerCinema(input: RegisterCinemaInput) {
	const { data } = await apiClient.post("/api/cinemas/register", input);
	return data;
}
