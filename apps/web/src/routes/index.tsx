import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import EventCard from "@/components/molecules/event-card";
import EventHero from "@/components/organisms/event-hero";
import { tryCatch } from "@/lib/try-catch";
import { useEventsStore } from "@/stores/events-store";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const events = useEventsStore((state) => state.events);
	const error = useEventsStore((state) => state.error);
	const setEvents = useEventsStore((state) => state.setEvents);
	const setError = useEventsStore((state) => state.setError);

	const getPublishedEventsFn = async (controller: AbortController) => {
		const [response, error] = await tryCatch(
			getPublishedEvents(undefined, controller.signal),
		);

		if (error) {
			setError("Não foi possível carregar os eventos.");
			return;
		}

		setEvents(response);
	};

	useEffect(() => {
		const controller = new AbortController();

		getPublishedEventsFn(controller);

		return () => controller.abort();
	}, []);

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			{error && <p className="text-destructive text-sm">{error}</p>}

			{!error && !events && (
				<div className="flex flex-col gap-6">
					<Skeleton className="aspect-21/9 w-full" />
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="aspect-2/3 w-full" />
						))}
					</div>
				</div>
			)}

			{events && events.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Nenhum evento publicado no momento.
				</p>
			)}

			{events && events.length > 0 && (
				<div className="flex flex-col gap-6">
					<EventHero events={events.slice(0, 4)} />

					<section>
						<h2 className="mb-4 font-semibold text-xl">Eventos em cartaz</h2>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{events.slice(4).map((event) => (
								<EventCard key={event.id} event={event} />
							))}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
