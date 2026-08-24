import { create } from "zustand";

import type { VerzelEvent } from "@/api/types";

interface EventsState {
	events: VerzelEvent[] | null;
	sessionCounts: Record<number, number> | null;
	error: string | null;
	setEvents: (events: VerzelEvent[] | null) => void;
	setSessionCounts: (sessionCounts: Record<number, number> | null) => void;
	setError: (error: string | null) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
	events: null,
	sessionCounts: null,
	error: null,
	setEvents: (events) => set({ events }),
	setSessionCounts: (sessionCounts) => set({ sessionCounts }),
	setError: (error) => set({ error }),
}));
