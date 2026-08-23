import CinemaSelect from "@/components/molecules/cinema-select";
import TimeSelect, {
	type SessionTimeOption,
} from "@/components/molecules/time-select";

export default function SessionPicker({
	cinemas,
	venueName,
	onSelectCinema,
	times,
	selectedTimeId,
	onSelectTime,
}: {
	cinemas: string[];
	venueName: string;
	onSelectCinema: (venue: string) => void;
	times: SessionTimeOption[];
	selectedTimeId: string;
	onSelectTime: (id: string) => void;
}) {
	if (cinemas.length === 0) return null;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-muted-foreground text-xs tracking-widest">
					CINEMA
				</h2>
				<CinemaSelect
					cinemas={cinemas}
					value={venueName}
					onChange={onSelectCinema}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<h2 className="text-muted-foreground text-xs tracking-widest">
					HORÁRIO
				</h2>
				<TimeSelect
					times={times}
					selectedTimeId={selectedTimeId}
					onSelectTime={onSelectTime}
				/>
			</div>
		</div>
	);
}
