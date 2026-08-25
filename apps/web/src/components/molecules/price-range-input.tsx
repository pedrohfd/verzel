import { Input } from "@verzel/ui/components/input";

function centsToReais(cents: number | undefined) {
	return cents === undefined ? "" : String(cents / 100);
}

function reaisToCents(reais: string) {
	if (!reais) return undefined;
	const value = Number(reais);
	if (Number.isNaN(value)) return undefined;
	return Math.round(value * 100);
}

export default function PriceRangeInput({
	minCents,
	maxCents,
	onChange,
}: {
	minCents: number | undefined;
	maxCents: number | undefined;
	onChange: (range: {
		minCents: number | undefined;
		maxCents: number | undefined;
	}) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<Input
				type="number"
				min={0}
				placeholder="Preço mín."
				aria-label="Preço mínimo"
				value={centsToReais(minCents)}
				onChange={(e) =>
					onChange({ minCents: reaisToCents(e.target.value), maxCents })
				}
			/>
			<span className="text-muted-foreground text-xs">até</span>
			<Input
				type="number"
				min={0}
				placeholder="Preço máx."
				aria-label="Preço máximo"
				value={centsToReais(maxCents)}
				onChange={(e) =>
					onChange({ minCents, maxCents: reaisToCents(e.target.value) })
				}
			/>
		</div>
	);
}
