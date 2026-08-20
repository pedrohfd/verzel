const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type TmdbImageSize = "w342" | "w1280";

export function tmdbImageUrl(path: string, size: TmdbImageSize) {
	return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
