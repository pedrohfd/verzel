import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { useEffect, useState } from "react";

import { searchMovies } from "@/api/requests/movies/search-movies";
import type { TmdbMovie } from "@/api/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

interface MovieSearchFieldProps {
	value: TmdbMovie | null;
	onChange: (movie: TmdbMovie | null) => void;
}

export default function MovieSearchField({
	value,
	onChange,
}: MovieSearchFieldProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<TmdbMovie[]>([]);
	const debouncedQuery = useDebouncedValue(query, 300);

	useEffect(() => {
		if (!debouncedQuery) {
			setResults([]);
			return;
		}

		const controller = new AbortController();
		(async () => {
			const [response, error] = await tryCatch(
				searchMovies(debouncedQuery, controller.signal),
			);
			if (!error) setResults(response);
		})();

		return () => controller.abort();
	}, [debouncedQuery]);

	if (value) {
		return (
			<div className="flex items-center gap-3 border border-border p-2">
				{value.poster_path && (
					<img
						src={tmdbImageUrl(value.poster_path, "w342")}
						alt={value.title}
						className="h-16 w-11 object-cover"
					/>
				)}
				<span className="flex-1 text-sm">{value.title}</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onChange(null)}
				>
					Trocar
				</Button>
			</div>
		);
	}

	return (
		<div className="relative">
			<Input
				id="movie-search"
				placeholder="Buscar filme no TMDb..."
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			{results.length > 0 && (
				<div className="absolute top-full right-0 left-0 z-10 max-h-72 overflow-y-auto border border-border bg-background">
					{results.slice(0, 6).map((movie) => (
						<button
							key={movie.id}
							type="button"
							className="flex w-full cursor-pointer items-center gap-3 border-border border-b p-2 text-left last:border-b-0 hover:bg-muted"
							onClick={() => {
								onChange(movie);
								setResults([]);
								setQuery("");
							}}
						>
							{movie.poster_path && (
								<img
									src={tmdbImageUrl(movie.poster_path, "w342")}
									alt={movie.title}
									className="h-16 w-11 object-cover"
								/>
							)}
							<span className="text-sm">{movie.title}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
