import { formatPriceCents } from "@/lib/format-price";

export interface PurchaseSummaryComboLine {
	id: string;
	name: string;
	quantity: number;
	subtotalCents: number;
}

type PurchaseSummaryProps = {
	ticketCount: number;
	ticketPriceCents: number;
	comboLines: PurchaseSummaryComboLine[];
};

export default function PurchaseSummary({
	ticketCount,
	ticketPriceCents,
	comboLines,
}: PurchaseSummaryProps) {
	const ticketsTotalCents = ticketPriceCents * ticketCount;
	const totalCents = comboLines.reduce(
		(sum, line) => sum + line.subtotalCents,
		ticketsTotalCents,
	);

	return (
		<div className="mb-6 flex flex-col gap-1">
			<p className="text-muted-foreground text-sm">
				{ticketCount}x {ticketCount > 1 ? "Ingressos" : "Ingresso"} —{" "}
				{formatPriceCents(ticketsTotalCents)}
			</p>
			{comboLines.map((line) => (
				<p key={line.id} className="text-muted-foreground text-sm">
					{line.quantity}x {line.name} — {formatPriceCents(line.subtotalCents)}
				</p>
			))}
			<p className="font-semibold text-sm">
				Total: {formatPriceCents(totalCents)}
			</p>
		</div>
	);
}
