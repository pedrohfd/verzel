import { createFileRoute, useNavigate } from "@tanstack/react-router";

import type { CinemaRoom } from "@/api/types";
import RoomForm from "@/components/organisms/room-form";
import { requireRole } from "@/lib/route-guards";

interface RoomsNewSearch {
	returnTo?: "new-event" | "edit-event";
	eventId?: string;
}

export const Route = createFileRoute("/organizer/rooms/new")({
	component: NewRoomComponent,
	beforeLoad: () => requireRole("organizador"),
	validateSearch: (search: Record<string, unknown>): RoomsNewSearch => ({
		returnTo:
			search.returnTo === "new-event" || search.returnTo === "edit-event"
				? search.returnTo
				: undefined,
		eventId: typeof search.eventId === "string" ? search.eventId : undefined,
	}),
});

function NewRoomComponent() {
	const navigate = useNavigate();
	const { returnTo, eventId } = Route.useSearch();

	function handleSaved(room: CinemaRoom) {
		if (returnTo === "new-event") {
			navigate({ to: "/organizer/new", search: { roomId: room.id } });
			return;
		}

		if (returnTo === "edit-event" && eventId) {
			navigate({
				to: "/organizer/$eventId/edit",
				params: { eventId },
				search: { roomId: room.id },
			});
			return;
		}

		navigate({ to: "/organizer/rooms" });
	}

	return (
		<div className="container mx-auto max-w-[1600px] px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Criar sala</h1>
			<RoomForm onSaved={handleSaved} />
		</div>
	);
}
