import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Card, CardContent } from "@verzel/ui/components/card";
import { useEffect, useState } from "react";

import { getCheckinEvents } from "@/api/requests/checkin/get-checkin-events";
import type { VerzelEvent } from "@/api/types";
import DateFilterPicker from "@/components/molecules/date-filter-picker";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

interface PortariaSearch {
	date?: string;
}

export const Route = createFileRoute("/portaria/")({
	component: PortariaEventsComponent,
	beforeLoad: () => requireRole("portaria"),
	validateSearch: (search: Record<string, unknown>): PortariaSearch => ({
		date: typeof search.date === "string" ? search.date : "",
	}),
});

function PortariaEventsComponent() {
	const { date = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [events, setEvents] = useState<VerzelEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getCheckinEvents({ date: date || undefined }, controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar as sessões.");
				return;
			}
			setEvents(response);
		})();

		return () => controller.abort();
	}, [date]);

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!events) return <Loader />;

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Portaria</h1>

			<div className="mb-4">
				<DateFilterPicker
					value={date}
					onChange={(next) =>
						navigate({ search: () => ({ date: next || undefined }) })
					}
					placeholder="Próximas 24h"
				/>
			</div>

			{events.length === 0 && (
				<p className="text-muted-foreground text-sm">
					{date
						? "Nenhuma sessão encontrada para a data selecionada."
						: "Nenhuma sessão disponível para validação no momento."}
				</p>
			)}

			<div className="flex flex-col gap-3">
				{events.map((event) => (
					<Card key={event.id}>
						<CardContent className="flex items-center justify-between gap-4">
							<div className="flex flex-col gap-1">
								<h3 className="font-semibold text-sm">{event.movieTitle}</h3>
								<p className="text-muted-foreground text-xs">
									{new Date(event.sessionAt).toLocaleString("pt-BR")} ·{" "}
									{event.venueName}
								</p>
							</div>
							<Link to="/portaria/$eventId" params={{ eventId: event.id }}>
								<Button>Validar ingressos</Button>
							</Link>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
