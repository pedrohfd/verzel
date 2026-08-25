import { useNavigate } from "@tanstack/react-router";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@verzel/ui/components/command";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import type { VerzelEvent } from "@/api/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { authClient } from "@/lib/auth-client";
import { dedupeEventsByMovie } from "@/lib/dedupe-events-by-movie";
import type { Role } from "@/lib/route-guards";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

const MAX_RESULTS = 5;

export default function SearchCommand() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<VerzelEvent[]>([]);
	const debouncedQuery = useDebouncedValue(query, 300);
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;
	const organizerId = role === "organizador" ? session?.user.id : undefined;

	useEffect(() => {
		if (!debouncedQuery) {
			setResults([]);
			return;
		}

		const controller = new AbortController();

		(async () => {
			const [response, error] = await tryCatch(
				getPublishedEvents(
					{ search: debouncedQuery, organizerId },
					controller.signal,
				),
			);
			if (!error) {
				setResults(dedupeEventsByMovie(response));
			}
		})();

		return () => controller.abort();
	}, [debouncedQuery, organizerId]);

	const goToResults = () => {
		if (!query) return;
		setOpen(false);
		navigate({ to: "/search", search: { q: query } });
		setQuery("");
		setResults([]);
	};

	const goToEvent = (eventId: string) => {
		setOpen(false);
		navigate({
			to: "/events/$eventId",
			params: { eventId },
		});
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="relative w-full max-w-sm text-left"
			>
				<Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<span className="block h-8 w-full rounded-full border border-input bg-transparent pl-8 text-muted-foreground text-xs leading-8">
					Buscar sessão...
				</span>
			</button>
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Buscar sessão"
				description="Busque por sessões publicadas"
			>
				<CommandInput
					value={query}
					onValueChange={setQuery}
					placeholder="Buscar sessão..."
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							goToResults();
						}
					}}
				/>
				<CommandList>
					{query && results.length === 0 && (
						<CommandEmpty>Nenhuma sessão encontrada.</CommandEmpty>
					)}
					{results.length > 0 && (
						<CommandGroup>
							{results.slice(0, MAX_RESULTS).map((event) => (
								<CommandItem
									key={event.id}
									value={event.movieTitle}
									onSelect={() => goToEvent(event.id)}
								>
									{event.moviePosterPath && (
										<img
											src={tmdbImageUrl(event.moviePosterPath, "w92")}
											alt={event.movieTitle}
											className="h-10 w-7 shrink-0 object-cover"
											loading="lazy"
											decoding="async"
										/>
									)}
									<span className="flex flex-col">
										<span>{event.movieTitle}</span>
										<span className="text-muted-foreground text-xs">
											{event.venueName}
										</span>
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					)}
					{results.length > 0 && (
						<CommandGroup>
							<CommandItem onSelect={goToResults}>
								Ver todos os resultados
							</CommandItem>
						</CommandGroup>
					)}
				</CommandList>
			</CommandDialog>
		</>
	);
}
