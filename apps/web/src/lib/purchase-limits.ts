export const MAX_TICKETS_PER_PURCHASE = 10;

// The server allows at most MAX_TICKETS_PER_PURCHASE live holds per customer
// and session; holds already in the current selection are part of that count.
export function selectableSeatLimit({
	activeHolds,
	heldInSelection,
}: {
	activeHolds: number;
	heldInSelection: number;
}) {
	return Math.max(
		0,
		MAX_TICKETS_PER_PURCHASE - (activeHolds - heldInSelection),
	);
}
