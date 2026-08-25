export interface ComboSelectionEntry {
	comboId: string;
	quantity: number;
}

export function serializeComboSelection(entries: ComboSelectionEntry[]) {
	return entries
		.filter((entry) => entry.quantity > 0)
		.map((entry) => `${entry.comboId}:${entry.quantity}`)
		.join(",");
}

export function parseComboSelection(raw: string | undefined) {
	if (!raw) return [];
	return raw
		.split(",")
		.map((part) => {
			const [comboId, quantity] = part.split(":");
			return { comboId, quantity: Number(quantity) };
		})
		.filter(
			(entry): entry is ComboSelectionEntry =>
				Boolean(entry.comboId) && entry.quantity > 0,
		);
}
