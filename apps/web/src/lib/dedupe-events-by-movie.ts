import type { VerzelEvent } from "@/api/types";

export function dedupeEventsByMovie(events: VerzelEvent[]) {
	const seen = new Set<number>();
	return events.filter((event) => {
		if (seen.has(event.tmdbMovieId)) return false;
		seen.add(event.tmdbMovieId);
		return true;
	});
}
