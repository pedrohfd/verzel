import { Button } from "@verzel/ui/components/button";
import { Card, CardContent, CardFooter } from "@verzel/ui/components/card";

import type { EnrichedMovie } from "@/api/types";
import { tmdbImageUrl } from "@/lib/tmdb-image";

export default function MovieCard({ movie }: { movie: EnrichedMovie }) {
	return (
		<Card className="gap-2">
			{movie.poster_path && (
				<img
					src={tmdbImageUrl(movie.poster_path, "w342")}
					alt={movie.title}
					className="aspect-2/3 w-full object-cover"
					loading="lazy"
				/>
			)}
			<CardContent className="flex flex-col gap-1">
				{movie.genre && (
					<span className="font-medium text-destructive text-xs uppercase tracking-wide">
						{movie.genre}
					</span>
				)}
				<h3 className="font-semibold text-sm">{movie.title}</h3>
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<span className="rounded-full border border-border px-2 py-0.5">
						{movie.certification}
					</span>
					{movie.runtime && <span>{movie.runtime} min</span>}
				</div>
			</CardContent>
			<CardFooter className="border-t-0 pt-0">
				<Button variant="outline" className="w-full">
					Ver sessões
				</Button>
			</CardFooter>
		</Card>
	);
}
