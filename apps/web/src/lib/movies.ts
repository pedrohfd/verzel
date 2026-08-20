export interface EnrichedMovie {
	id: number;
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	genre: string | null;
	runtime: number | null;
	certification: string;
	audio: "Dublado";
}
