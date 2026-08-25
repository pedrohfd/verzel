import { Button } from "@verzel/ui/components/button";
import { Calendar } from "@verzel/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@verzel/ui/components/popover";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "long",
	year: "numeric",
});

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

export default function DateFilterPicker({
	value,
	onChange,
	placeholder = "Todas as datas",
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const selectedDate = value ? parseLocalDate(value) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button variant="outline" className="justify-start font-normal" />
				}
			>
				<CalendarIcon />
				{selectedDate ? dateFormatter.format(selectedDate) : placeholder}
			</PopoverTrigger>
			<PopoverContent align="start" className="flex flex-col gap-2">
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => {
						if (!date) return;
						onChange(formatLocalDate(date));
						setOpen(false);
					}}
				/>
				{value && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							onChange("");
							setOpen(false);
						}}
					>
						<X />
						Limpar filtro de data
					</Button>
				)}
			</PopoverContent>
		</Popover>
	);
}
