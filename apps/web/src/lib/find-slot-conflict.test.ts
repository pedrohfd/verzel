import { describe, expect, it } from "vitest";

import type { RoomScheduleSlot } from "@/api/requests/rooms/get-room-schedule";
import { findSlotConflict } from "./find-slot-conflict";

describe("findSlotConflict", () => {
	const slots: RoomScheduleSlot[] = [
		{ sessionAt: "2026-01-01T12:00:00", durationMinutes: 120 },
	];

	it("returns null when there is no overlapping slot", () => {
		expect(findSlotConflict("2026-01-01T09:00", 60, slots)).toBeNull();
	});

	it("returns the conflicting slot when sessions overlap directly", () => {
		expect(findSlotConflict("2026-01-01T13:00", 60, slots)).toEqual(slots[0]);
	});

	it("still conflicts when starting right at the existing session's end (no cleanup buffer)", () => {
		expect(findSlotConflict("2026-01-01T14:00", 60, slots)).toEqual(slots[0]);
	});

	it("still conflicts inside the 10-minute cleanup buffer after the existing session ends", () => {
		expect(findSlotConflict("2026-01-01T14:05", 60, slots)).toEqual(slots[0]);
	});

	it("does not conflict once the 10-minute cleanup buffer has passed", () => {
		expect(findSlotConflict("2026-01-01T14:10", 60, slots)).toBeNull();
	});

	it("blocks a new session whose own cleanup buffer would collide with a later session", () => {
		const laterSlots: RoomScheduleSlot[] = [
			{ sessionAt: "2026-01-01T14:05", durationMinutes: 60 },
		];

		expect(findSlotConflict("2026-01-01T12:00", 120, laterSlots)).toEqual(
			laterSlots[0],
		);
	});

	it("returns null when sessionAtLocal is empty", () => {
		expect(findSlotConflict("", 60, slots)).toBeNull();
	});
});
