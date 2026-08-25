import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";

import DateFilterPicker from "@/components/molecules/date-filter-picker";
import PriceRangeInput from "@/components/molecules/price-range-input";

const ALL_VENUES = "__all__";

export interface EventFiltersValue {
	date: string;
	venue: string;
	priceMin: number | undefined;
	priceMax: number | undefined;
}

export default function EventFiltersBar({
	venues,
	filters,
	onChange,
}: {
	venues: string[];
	filters: EventFiltersValue;
	onChange: (filters: EventFiltersValue) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<DateFilterPicker
				value={filters.date}
				onChange={(date) => onChange({ ...filters, date })}
			/>

			{venues.length > 0 && (
				<Select
					value={filters.venue || ALL_VENUES}
					onValueChange={(venue) => {
						if (!venue) return;
						onChange({ ...filters, venue: venue === ALL_VENUES ? "" : venue });
					}}
					items={[
						{ value: ALL_VENUES, label: "Todos os cinemas" },
						...venues.map((venue) => ({ value: venue, label: venue })),
					]}
				>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_VENUES}>Todos os cinemas</SelectItem>
						{venues.map((venue) => (
							<SelectItem key={venue} value={venue}>
								{venue}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<PriceRangeInput
				minCents={filters.priceMin}
				maxCents={filters.priceMax}
				onChange={({ minCents, maxCents }) =>
					onChange({ ...filters, priceMin: minCents, priceMax: maxCents })
				}
			/>
		</div>
	);
}
