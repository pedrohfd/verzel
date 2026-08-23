import type { RoomScheduleSlot } from "@/api/requests/rooms/get-room-schedule";

export function findSlotConflict(
	sessionAtLocal: string,
	durationMinutes: number,
	slots: RoomScheduleSlot[],
) {
	if (!sessionAtLocal) return null;

	const start = new Date(sessionAtLocal);
	const end = new Date(start.getTime() + durationMinutes * 60_000);

	return (
		slots.find((slot) => {
			const slotStart = new Date(slot.sessionAt);
			const slotEnd = new Date(
				slotStart.getTime() + slot.durationMinutes * 60_000,
			);
			return start < slotEnd && end > slotStart;
		}) ?? null
	);
}
