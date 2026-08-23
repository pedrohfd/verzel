import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";

export default function CinemaSelect({
	cinemas,
	value,
	onChange,
}: {
	cinemas: string[];
	value: string;
	onChange: (venue: string) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(venue) => {
				if (!venue || venue === value) return;
				onChange(venue);
			}}
			items={cinemas.map((cinema) => ({ value: cinema, label: cinema }))}
		>
			<SelectTrigger className="w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{cinemas.map((cinema) => (
					<SelectItem key={cinema} value={cinema}>
						{cinema}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
