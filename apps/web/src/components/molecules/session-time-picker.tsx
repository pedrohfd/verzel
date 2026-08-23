import { Button } from "@verzel/ui/components/button";
import { Calendar } from "@verzel/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@verzel/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import type { RoomScheduleSlot } from "@/api/requests/rooms/get-room-schedule";
import { findSlotConflict } from "@/lib/find-slot-conflict";

const START_HOUR = 9;
const END_HOUR = 23;
const MINUTE_STEP = 5;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "long",
	year: "numeric",
});

function generateHours() {
	const hours: string[] = [];
	for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
		hours.push(String(hour).padStart(2, "0"));
	}
	return hours;
}

function generateMinutes() {
	const minutes: string[] = [];
	for (let minute = 0; minute < 60; minute += MINUTE_STEP) {
		minutes.push(String(minute).padStart(2, "0"));
	}
	return minutes;
}

function splitDatetimeLocal(value: string) {
	const [date = "", time = ""] = value.split("T");
	return { date, time };
}

function combineDatetimeLocal(date: string, time: string) {
	if (!date) return "";
	return `${date}T${time}`;
}

function splitTime(time: string) {
	const [hour = "", minute = ""] = time.split(":");
	return { hour, minute };
}

function parseLocalDate(date: string) {
	const [year, month, day] = date.split("-").map(Number);
	if (!year || !month || !day) return undefined;
	return new Date(year, month - 1, day);
}

function formatLocalDate(value: Date) {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export default function SessionTimePicker({
	id,
	value,
	onChange,
	onBlur,
	occupiedSlots,
	durationMinutes,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	occupiedSlots: RoomScheduleSlot[];
	durationMinutes: number;
}) {
	const [calendarOpen, setCalendarOpen] = useState(false);
	const { date, time } = splitDatetimeLocal(value);
	const { hour, minute } = splitTime(time);
	const hours = generateHours();
	const minutes = generateMinutes();
	const hourOptions = hours.includes(hour)
		? hours
		: [hour, ...hours].filter(Boolean);
	const minuteOptions = minutes.includes(minute)
		? minutes
		: [minute, ...minutes].filter(Boolean);
	const selectedDate = date ? parseLocalDate(date) : undefined;

	function changeTime(nextHour: string, nextMinute: string) {
		const nextTime = nextHour && nextMinute ? `${nextHour}:${nextMinute}` : "";
		onChange(combineDatetimeLocal(date, nextTime));
	}

	function changeDate(nextDate: Date | undefined) {
		if (!nextDate) return;
		onChange(combineDatetimeLocal(formatLocalDate(nextDate), time));
		setCalendarOpen(false);
	}

	return (
		<div className="flex gap-2">
			<Popover
				open={calendarOpen}
				onOpenChange={(open) => {
					setCalendarOpen(open);
					if (!open) onBlur?.();
				}}
			>
				<PopoverTrigger
					id={id}
					render={
						<Button
							variant="outline"
							className="flex-1 justify-start font-normal"
						/>
					}
				>
					<CalendarIcon />
					{selectedDate
						? dateFormatter.format(selectedDate)
						: "Selecionar data"}
				</PopoverTrigger>
				<PopoverContent align="start">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={changeDate}
					/>
				</PopoverContent>
			</Popover>
			<Select
				value={hour}
				onValueChange={(nextHour) => changeTime(nextHour ?? "", minute || "00")}
				disabled={!date}
				items={hourOptions.map((h) => ({ value: h, label: h }))}
			>
				<SelectTrigger className="w-20">
					<SelectValue placeholder="Hora" />
				</SelectTrigger>
				<SelectContent>
					{hourOptions.map((h) => {
						const occupied = Boolean(
							findSlotConflict(
								combineDatetimeLocal(date, `${h}:${minute || "00"}`),
								durationMinutes,
								occupiedSlots,
							),
						);
						return (
							<SelectItem key={h} value={h} disabled={occupied}>
								{h}
								{occupied ? " (ocupado)" : ""}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
			<Select
				value={minute}
				onValueChange={(nextMinute) => changeTime(hour, nextMinute ?? "")}
				disabled={!date || !hour}
				items={minuteOptions.map((m) => ({ value: m, label: m }))}
			>
				<SelectTrigger className="w-20">
					<SelectValue placeholder="Min" />
				</SelectTrigger>
				<SelectContent>
					{minuteOptions.map((m) => {
						const occupied = Boolean(
							findSlotConflict(
								combineDatetimeLocal(date, `${hour}:${m}`),
								durationMinutes,
								occupiedSlots,
							),
						);
						return (
							<SelectItem key={m} value={m} disabled={occupied}>
								{m}
								{occupied ? " (ocupado)" : ""}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</div>
	);
}
