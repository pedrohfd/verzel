export function seatLabel(row: number, column: number): string {
	const letter = String.fromCharCode(65 + row);
	return `${letter}${column + 1}`;
}
