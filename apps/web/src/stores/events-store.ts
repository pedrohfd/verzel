import { create } from "zustand";

import type { VerzelEvent } from "@/api/types";

interface EventsState {
	events: VerzelEvent[] | null;
	error: string | null;
	setEvents: (events: VerzelEvent[] | null) => void;
	setError: (error: string | null) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
	events: null,
	error: null,
	setEvents: (events) => set({ events }),
	setError: (error) => set({ error }),
}));
