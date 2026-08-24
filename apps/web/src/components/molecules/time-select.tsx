import {
	ToggleGroup,
	ToggleGroupItem,
} from "@verzel/ui/components/toggle-group";

export type SessionTimeOption = {
	id: string;
	date: Date;
	roomName: string | null;
};

export default function TimeSelect({
	times,
	selectedTimeId,
	onSelectTime,
}: {
	times: SessionTimeOption[];
	selectedTimeId: string;
	onSelectTime: (id: string) => void;
}) {
	if (times.length === 0) return null;

	return (
		<ToggleGroup
			orientation="vertical"
			className="w-full"
			value={[selectedTimeId]}
			onValueChange={(value) => {
				const id = value[0];
				if (!id || id === selectedTimeId) return;
				onSelectTime(id);
			}}
		>
			{times.map(({ id, date, roomName }) => (
				<ToggleGroupItem
					key={id}
					value={id}
					className="w-full justify-start border border-input px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
				>
					{date.toLocaleTimeString("pt-BR", {
						hour: "2-digit",
						minute: "2-digit",
					})}
					{roomName ? ` · ${roomName}` : ""}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
