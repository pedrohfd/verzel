import { create } from "zustand";

import type { EnrichedMovie } from "@/api/types";

interface MoviesState {
	movies: EnrichedMovie[] | null;
	error: string | null;
	setMovies: (movies: EnrichedMovie[] | null) => void;
	setError: (error: string | null) => void;
}

export const useMoviesStore = create<MoviesState>((set) => ({
	movies: null,
	error: null,
	setMovies: (movies) => set({ movies }),
	setError: (error) => set({ error }),
}));
