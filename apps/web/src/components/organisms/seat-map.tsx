import { cn } from "@verzel/ui/lib/utils";

import type { Seat } from "@/api/types";

export default function SeatMap({
	seats,
	columns,
	selectedSeatId,
	onSelect,
}: {
	seats: Seat[];
	columns: number;
	selectedSeatId: string | null;
	onSelect: (seat: Seat) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div
				className="grid w-fit gap-2"
				style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
			>
				{seats.map((seat) => {
					const isSelected = seat.id === selectedSeatId;
					const isTaken = seat.status === "taken";

					return (
						<button
							key={seat.id}
							type="button"
							disabled={isTaken}
							aria-label={`Assento ${seat.label}${isTaken ? " (ocupado)" : ""}`}
							aria-pressed={isSelected}
							onClick={() => onSelect(seat)}
							className={cn(
								"flex size-9 items-center justify-center border text-xs transition-colors",
								isTaken &&
									"cursor-not-allowed border-transparent bg-muted text-muted-foreground/50",
								!isTaken &&
									!isSelected &&
									"cursor-pointer border-border bg-background hover:bg-muted",
								isSelected &&
									"cursor-pointer border-primary bg-primary text-primary-foreground",
							)}
						>
							{seat.label}
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-4 text-muted-foreground text-xs">
				<span className="flex items-center gap-1.5">
					<span className="size-3 border border-border bg-background" />
					Disponível
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 border border-primary bg-primary" />
					Selecionado
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 bg-muted" />
					Ocupado
				</span>
			</div>
		</div>
	);
}
