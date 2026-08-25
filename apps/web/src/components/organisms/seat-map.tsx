import { MAX_COLUMNS, MAX_ROWS } from "@verzel/shared/validators";
import { cn } from "@verzel/ui/lib/utils";
import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";

import type { Seat } from "@/api/types";

const DEFAULT_SEAT_SIZE = 32;
const MIN_SEAT_SIZE = 16;
const SEAT_GAP = 6;
const AISLE_GAP = 24;
const ROW_GAP = 4;
const ROW_LABEL_WIDTH = 16;
const ROW_LABEL_GAP = 12;
const BOTTOM_MARGIN = 24;
const SECTION_GAP = 20;
const ROW_LIST_PADDING = 16;

type SelectedSeat = { row: number; column: number };

type SeatMapProps = {
	seats: Seat[];
	selectedSeats: SelectedSeat[];
	onSelect: (seat: Seat) => void;
	readOnly?: boolean;
};

function isSeatSelected(seat: Seat, selected: SelectedSeat[]): boolean {
	return selected.some((s) => seat.row === s.row && seat.column === s.column);
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
				isLg ? "max-w-2xl gap-2" : "max-w-md gap-1",
			)}
		>
			<svg
				viewBox="0 0 400 40"
				className={cn("w-full text-destructive", isLg ? "h-8" : "h-6")}
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path
					d="M 10 10 Q 200 40 390 10"
					fill="none"
					stroke="currentColor"
					strokeWidth={isLg ? 4 : 3}
					strokeLinecap="round"
				/>
			</svg>
			<span
				className={cn(
					"text-muted-foreground tracking-[0.3em]",
					isLg ? "text-sm" : "text-[10px]",
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
			viewBox="0 0 100 100"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<path d="M19 28C19 22.4772 23.4772 18 29 18H71C76.5228 18 81 22.4772 81 28V82C73.931 75.9278 62.6764 72 50 72C37.3236 72 26.069 75.9278 19 82V28Z" />
			<path d="M50 73C37.3236 73 29 76 20 82H80C71 76 62.6764 73 50 73Z" />
			<path d="M82 37C82 32.0294 86.0294 28 91 28V28C95.9706 28 100 32.0294 100 37V82H82V37Z" />
			<path d="M0 37C0 32.0294 4.02944 28 9 28V28C13.9706 28 18 32.0294 18 37V82H0V37Z" />
		</svg>
	);
}

function SeatBlock({
	seats,
	selectedSeats,
	onSelect,
	readOnly,
}: {
	seats: Seat[];
	selectedSeats: SelectedSeat[];
	onSelect: (seat: Seat) => void;
	readOnly?: boolean;
}) {
	return (
		<div
			data-slot="seat-block"
			className="grid gap-1.5"
			style={{
				gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))`,
			}}
		>
			{seats.map((seat) => {
				const isSelected = isSeatSelected(seat, selectedSeats);
				const isTaken = seat.status === "taken";

				return (
					<button
						key={`${seat.row}-${seat.column}`}
						type="button"
						disabled={isTaken || readOnly}
						aria-label={`Assento ${seat.label}${isTaken ? " (ocupado)" : ""}`}
						aria-pressed={isSelected}
						onClick={() => onSelect(seat)}
						className={cn(
							"relative flex h-(--seat-size) w-(--seat-size) flex-col items-center justify-center gap-0.5 rounded-md transition-colors",
							isTaken && "cursor-not-allowed text-muted-foreground/40",
							!isTaken && readOnly && "cursor-default text-foreground/70",
							!isTaken &&
								!readOnly &&
								!isSelected &&
								"cursor-pointer text-foreground/70 hover:bg-muted hover:text-foreground",
							isSelected && "cursor-pointer bg-primary text-primary-foreground",
						)}
					>
						<SeatIcon className="h-3/5 w-3/5" />
						<span className="text-xs leading-none">{seat.label}</span>
					</button>
				);
			})}
		</div>
	);
}

function Legend() {
	return (
		<div className="flex w-full flex-wrap items-center justify-center gap-3 text-muted-foreground text-xs">
			<span className="flex items-center gap-1.5">
				<span className="size-3 rounded-sm bg-primary" />
				Selecionado
			</span>
			<span className="flex items-center gap-1.5">
				<span className="size-3 rounded-sm border border-foreground/30" />
				Disponível
			</span>
			<span className="flex items-center gap-1.5">
				<span className="size-3 rounded-sm bg-muted-foreground/40" />
				Ocupado
			</span>
		</div>
	);
}

function useFitSeatSize() {
	const containerRef = useRef<HTMLDivElement>(null);
	const screenRef = useRef<HTMLDivElement>(null);
	const legendRef = useRef<HTMLDivElement>(null);
	const [seatSize, setSeatSize] = useState(DEFAULT_SEAT_SIZE);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		function recompute() {
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (!window.innerHeight || rect.width === 0) {
				setSeatSize(DEFAULT_SEAT_SIZE);
				return;
			}

			const availableHeight =
				window.innerHeight - Math.max(0, rect.top) - BOTTOM_MARGIN;
			const reserved =
				(screenRef.current?.offsetHeight ?? 0) +
				(legendRef.current?.offsetHeight ?? 0) +
				SECTION_GAP * 2 +
				ROW_LIST_PADDING;
			const rowsHeight = Math.max(0, availableHeight - reserved);
			const maxByHeight = (rowsHeight - (MAX_ROWS - 1) * ROW_GAP) / MAX_ROWS;

			const widthForSeats =
				el.clientWidth - ROW_LABEL_WIDTH * 2 - ROW_LABEL_GAP * 2 - AISLE_GAP;
			const maxByWidth =
				(widthForSeats - (MAX_COLUMNS - 1) * SEAT_GAP) / MAX_COLUMNS;

			const next = Math.min(maxByHeight, maxByWidth);
			setSeatSize(
				Number.isFinite(next) && next > 0
					? Math.max(MIN_SEAT_SIZE, next)
					: DEFAULT_SEAT_SIZE,
			);
		}

		recompute();

		let raf = 0;
		function onChange() {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(recompute);
		}

		window.addEventListener("resize", onChange);
		window.addEventListener("scroll", onChange, { passive: true });
		const observer =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(onChange)
				: null;
		observer?.observe(el);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", onChange);
			window.removeEventListener("scroll", onChange);
			observer?.disconnect();
		};
	}, []);

	return { containerRef, screenRef, legendRef, seatSize };
}

export default function SeatMap({
	seats,
	selectedSeats,
	onSelect,
	readOnly,
}: SeatMapProps) {
	const rows = buildRows(seats);
	const { containerRef, screenRef, legendRef, seatSize } = useFitSeatSize();

	return (
		<div
			ref={containerRef}
			className="flex flex-col gap-5"
			style={{ "--seat-size": `${seatSize}px` } as CSSProperties}
		>
			<div ref={screenRef}>
				<ScreenIndicator size="lg" />
			</div>

			<div className="w-full">
				<div
					className="flex w-full flex-col items-center px-2 py-2"
					style={{ gap: ROW_GAP }}
				>
					{rows.map((row) => {
						const [left, right] = splitAisle(row.seats);
						return (
							<div key={row.row} className="flex items-center gap-3">
								<span className="w-4 shrink-0 text-center text-muted-foreground text-xs">
									{row.label}
								</span>
								<div
									className="flex items-center gap-6"
									data-slot="seat-row-blocks"
								>
									<SeatBlock
										seats={left}
										selectedSeats={selectedSeats}
										onSelect={onSelect}
										readOnly={readOnly}
									/>
									{right.length > 0 && (
										<SeatBlock
											seats={right}
											selectedSeats={selectedSeats}
											onSelect={onSelect}
											readOnly={readOnly}
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

			<div ref={legendRef}>
				<Legend />
			</div>
		</div>
	);
}
