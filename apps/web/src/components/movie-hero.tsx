import { Button } from "@verzel/ui/components/button";
import { Play } from "lucide-react";
import { useState } from "react";

import type { EnrichedMovie } from "@/lib/movies";

export default function MovieHero({ movies }: { movies: EnrichedMovie[] }) {
	const [activeIndex, setActiveIndex] = useState(0);
	const movie = movies[activeIndex];

	if (!movie) return null;

	return (
		<div className="relative aspect-21/9 w-full overflow-hidden bg-muted">
			{movie.backdrop_path && (
				<img
					src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
					alt={movie.title}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			)}
			<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

			<div className="relative flex h-full flex-col justify-end gap-3 p-6">
				{movie.genre && (
					<span className="w-fit rounded-full bg-destructive px-3 py-1 font-medium text-white text-xs">
						{movie.genre}
					</span>
				)}
				<h1 className="font-bold text-3xl text-white">{movie.title}</h1>
				<p className="text-sm text-white/80">
					{movie.certification} · {movie.runtime ?? "—"} min · {movie.audio}
				</p>
				<div className="flex items-center gap-2">
					<Button className="bg-destructive text-white hover:bg-destructive/90">
						Ingressos
					</Button>
					<Button variant="outline" size="icon">
						<Play />
					</Button>
				</div>
			</div>

			<div className="absolute right-6 bottom-6 flex gap-1.5">
				{movies.map((m, index) => (
					<button
						key={m.id}
						type="button"
						aria-label={`Ver ${m.title}`}
						onClick={() => setActiveIndex(index)}
						className={`size-2 rounded-full transition-colors ${
							index === activeIndex ? "bg-destructive" : "bg-white/40"
						}`}
					/>
				))}
			</div>
		</div>
	);
}
