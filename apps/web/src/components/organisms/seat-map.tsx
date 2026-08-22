import { cn } from "@verzel/ui/lib/utils";

import type { Seat } from "@/api/types";

type SelectedSeat = { row: number; column: number };

type SeatMapProps = {
	seats: Seat[];
	columns: number;
	selectedSeat: SelectedSeat | null;
	onSelect: (seat: Seat) => void;
};

function isSameSeat(seat: Seat, selected: SelectedSeat | null): boolean {
	return (
		selected !== null &&
		seat.row === selected.row &&
		seat.column === selected.column
	);
}

type Row = { row: number; label: string; seats: Seat[] };

function buildRows(seats: Seat[]): Row[] {
	const byRow = new Map<number, Seat[]>();
	for (const seat of seats) {
		const bucket = byRow.get(seat.row) ?? [];
		bucket.push(seat);
		byRow.set(seat.row, bucket);
	}
	return [...byRow.entries()]
		.sort(([a], [b]) => a - b)
		.map(([row, rowSeats]) => ({
			row,
			label: rowSeats[0]?.label.replace(/\d+$/, "") ?? "",
			seats: [...rowSeats].sort((a, b) => a.column - b.column),
		}));
}

function splitAisle(rowSeats: Seat[]): [Seat[], Seat[]] {
	if (rowSeats.length < 4) return [rowSeats, []];
	const mid = Math.ceil(rowSeats.length / 2);
	return [rowSeats.slice(0, mid), rowSeats.slice(mid)];
}

export function ScreenIndicator({ size = "sm" }: { size?: "sm" | "lg" }) {
	const isLg = size === "lg";
	return (
		<div
			className={cn(
				"mx-auto flex w-full flex-col items-center",
				isLg ? "max-w-4xl gap-2" : "max-w-md gap-1",
			)}
		>
			<svg
				viewBox="0 0 400 40"
				className={cn("w-full text-destructive", isLg ? "h-12" : "h-6")}
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path
					d="M 10 10 Q 200 40 390 10"
					fill="none"
					stroke="currentColor"
					strokeWidth={isLg ? 6 : 3}
					strokeLinecap="round"
				/>
			</svg>
			<span
				className={cn(
					"text-muted-foreground tracking-[0.3em]",
					isLg ? "text-xl" : "text-[10px]",
				)}
			>
				TELA
			</span>
		</div>
	);
}

export function SeatIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<path d="M6 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9H6V3Z" opacity={0.55} />
			<path d="M4 10a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" />
			<path d="M5 17h1v3a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Z" />
			<path d="M18 17h1a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-3Z" />
		</svg>
	);
}

function SeatBlock({
	seats,
	selectedSeat,
	onSelect,
}: {
	seats: Seat[];
	selectedSeat: SelectedSeat | null;
	onSelect: (seat: Seat) => void;
}) {
	return (
		<div
			data-slot="seat-block"
			className="grid gap-2"
			style={{
				gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))`,
			}}
		>
			{seats.map((seat) => {
				const isSelected = isSameSeat(seat, selectedSeat);
				const isTaken = seat.status === "taken";

				return (
					<button
						key={`${seat.row}-${seat.column}`}
						type="button"
						disabled={isTaken}
						aria-label={`Assento ${seat.label}${isTaken ? " (ocupado)" : ""}`}
						aria-pressed={isSelected}
						onClick={() => onSelect(seat)}
						className={cn(
							"relative flex size-9 flex-col items-center justify-center gap-0.5 rounded-md transition-colors",
							isTaken && "cursor-not-allowed text-muted-foreground/40",
							!isTaken &&
								!isSelected &&
								"cursor-pointer text-foreground/70 hover:bg-muted hover:text-foreground",
							isSelected && "cursor-pointer bg-primary text-primary-foreground",
						)}
					>
						<SeatIcon className="size-6" />
						<span className="text-[9px] leading-none">{seat.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function Legend() {
	return (
		<div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
			<span className="flex items-center gap-1.5">
				<SeatIcon className="size-4 rounded-md bg-primary p-0.5 text-primary-foreground" />
				Selecionado
			</span>
			<span className="flex items-center gap-1.5">
				<SeatIcon className="size-4 text-foreground/70" />
				Disponível
			</span>
			<span className="flex items-center gap-1.5">
				<SeatIcon className="size-4 text-muted-foreground/40" />
				Ocupado
			</span>
		</div>
	);
}

export default function SeatMap({
	seats,
	selectedSeat,
	onSelect,
}: SeatMapProps) {
	const rows = buildRows(seats);

	return (
		<div className="flex flex-col gap-6">
			<ScreenIndicator />

			<div className="w-full overflow-x-auto">
				<div className="flex w-fit min-w-full flex-col items-center gap-2 px-2 py-2">
					{rows.map((row) => {
						const [left, right] = splitAisle(row.seats);
						return (
							<div key={row.row} className="flex items-center gap-3">
								<span className="w-4 shrink-0 text-center text-muted-foreground text-xs">
									{row.label}
								</span>
								<div
									className="flex items-center gap-8"
									data-slot="seat-row-blocks"
								>
									<SeatBlock
										seats={left}
										selectedSeat={selectedSeat}
										onSelect={onSelect}
									/>
									{right.length > 0 && (
										<SeatBlock
											seats={right}
											selectedSeat={selectedSeat}
											onSelect={onSelect}
										/>
									)}
								</div>
								<span className="w-4 shrink-0 text-center text-muted-foreground text-xs">
									{row.label}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			<Legend />
		</div>
	);
}
