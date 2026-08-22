import { MAX_COLUMNS, MAX_ROWS } from "@verzel/shared/validators";

import { ScreenIndicator, SeatIcon } from "@/components/organisms/seat-map";

type CinemaRoomPreviewProps = {
	rows: number;
	columns: number;
};

function splitAisle(count: number): [number, number] {
	if (count < 4) return [count, 0];
	const mid = Math.ceil(count / 2);
	return [mid, count - mid];
}

function rowLabel(index: number) {
	return String.fromCharCode(65 + index);
}

function RowLabel({ children }: { children: string }) {
	return (
		<span className="w-6 shrink-0 text-center text-muted-foreground text-xs">
			{children}
		</span>
	);
}

const SEAT_MAX_PX = 46;
const SEAT_MIN_PX = 20;
const SEAT_GAP_PX = 6;
const AISLE_GAP_PX = 16;
const ROW_LABEL_PX = 24;
const ROW_GAP_PX = 8;

function SeatGroup({
	count,
	totalColumns,
}: {
	count: number;
	totalColumns: number;
}) {
	return (
		<div
			className="grid gap-1.5"
			style={{
				gridTemplateColumns: `repeat(${count}, minmax(${SEAT_MIN_PX}px, 1fr))`,
				width: `${(count / totalColumns) * 100}%`,
			}}
		>
			{Array.from({ length: count }).map((_, index) => (
				<SeatIcon
					key={index}
					className="aspect-square min-w-1.5 text-foreground/70"
				/>
			))}
		</div>
	);
}

export default function CinemaRoomPreview({
	rows,
	columns,
}: CinemaRoomPreviewProps) {
	const safeRows = Number.isFinite(rows)
		? Math.min(Math.max(rows, 0), MAX_ROWS)
		: 0;
	const safeColumns = Number.isFinite(columns)
		? Math.min(Math.max(columns, 0), MAX_COLUMNS)
		: 0;

	if (safeRows === 0 || safeColumns === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Informe fileiras e assentos para visualizar a sala.
			</p>
		);
	}

	const [left, right] = splitAisle(safeColumns);

	const seatsWidthPx =
		safeColumns * SEAT_MAX_PX +
		(safeColumns - 1) * SEAT_GAP_PX +
		(right > 0 ? AISLE_GAP_PX : 0);
	const contentWidthPx = seatsWidthPx + 2 * (ROW_LABEL_PX + ROW_GAP_PX);

	return (
		<div className="flex flex-col gap-4 border border-border p-4">
			<ScreenIndicator size="lg" />

			<div className="w-full overflow-x-auto">
				<div
					className="mx-auto flex flex-col items-center gap-2 px-2 py-2"
					style={{ width: `min(100%, ${contentWidthPx}px)` }}
				>
					{Array.from({ length: safeRows }).map((_, rowIndex) => (
						<div
							key={rowIndex}
							className="flex w-full items-center justify-center gap-2"
						>
							<RowLabel>{rowLabel(rowIndex)}</RowLabel>
							<div className="flex min-w-0 flex-1 items-center justify-center gap-4">
								<SeatGroup count={left} totalColumns={safeColumns} />
								{right > 0 && (
									<SeatGroup count={right} totalColumns={safeColumns} />
								)}
							</div>
							<RowLabel>{rowLabel(rowIndex)}</RowLabel>
						</div>
					))}
				</div>
			</div>

			<p className="text-center text-muted-foreground text-xs">
				{safeRows} fileiras × {safeColumns} assentos = {safeRows * safeColumns}{" "}
				lugares
			</p>
		</div>
	);
}
