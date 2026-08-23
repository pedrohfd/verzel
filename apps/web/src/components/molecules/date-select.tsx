import {
	ToggleGroup,
	ToggleGroupItem,
} from "@verzel/ui/components/toggle-group";

import { formatSessionDateLabel } from "@/lib/format-session-date-label";

export type SessionDateOption = { key: string; date: Date };

export default function DateSelect({
	dates,
	selectedDateKey,
	onSelectDate,
}: {
	dates: SessionDateOption[];
	selectedDateKey: string;
	onSelectDate: (key: string) => void;
}) {
	if (dates.length === 0) return null;

	return (
		<ToggleGroup
			value={[selectedDateKey]}
			onValueChange={(value) => {
				const key = value[0];
				if (!key || key === selectedDateKey) return;
				onSelectDate(key);
			}}
		>
			{dates.map(({ key, date }) => {
				const label = formatSessionDateLabel(date);
				return (
					<ToggleGroupItem
						key={key}
						value={key}
						aria-label={`${label.weekday} ${label.date}`}
						className="flex h-auto flex-col gap-0.5 border border-input px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
					>
						<span className="font-medium text-[10px] tracking-wide">
							{label.weekday}
						</span>
						<span className="font-semibold text-sm">{label.date}</span>
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}
