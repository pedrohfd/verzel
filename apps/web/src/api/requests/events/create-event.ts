import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export interface CreateEventInput {
	tmdbMovieId: number;
	movieTitle: string;
	moviePosterPath: string | null;
	movieBackdropPath: string | null;
	sessionAt: string;
	venueName: string;
	venueAddress: string;
	priceCents: number;
	rows: number;
	columns: number;
}

export async function createEvent(input: CreateEventInput) {
	const { data } = await apiClient.post<VerzelEvent>("/api/events", input);
	return data;
}
