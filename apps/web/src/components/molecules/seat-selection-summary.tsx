import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { ArrowRight, X } from "lucide-react";

import type { Seat } from "@/api/types";
import { formatPriceCents } from "@/lib/format-price";

type SeatSelectionSummaryProps = {
	selectedSeats: Seat[];
	priceCents: number;
	isReserving: boolean;
	onRemove: (seat: Seat) => void;
	onReserve: () => void;
};

export default function SeatSelectionSummary({
	selectedSeats,
	priceCents,
	isReserving,
	onRemove,
	onReserve,
}: SeatSelectionSummaryProps) {
	return (
		<div className="flex flex-col gap-3">
			<h2 className="text-muted-foreground text-xs tracking-widest">
				INGRESSOS SELECIONADOS
			</h2>

			{selectedSeats.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Selecione os assentos no mapa ao lado.
				</p>
			) : (
				<div className="flex flex-wrap gap-2">
					{selectedSeats.map((seat) => (
						<Badge key={`${seat.row}-${seat.column}`} data-icon="inline-end">
							{seat.label}
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={`Remover assento ${seat.label}`}
								onClick={() => onRemove(seat)}
							>
								<X />
							</Button>
						</Badge>
					))}
				</div>
			)}

			<div className="flex items-center justify-between border-t pt-3">
				<span className="text-muted-foreground text-sm">Total</span>
				<span className="font-semibold text-lg">
					{formatPriceCents(priceCents * selectedSeats.length)}
				</span>
			</div>

			<Button
				className="w-full"
				data-icon="inline-end"
				disabled={selectedSeats.length === 0 || isReserving}
				onClick={onReserve}
			>
				{isReserving ? "Reservando..." : "Continuar"}
				<ArrowRight />
			</Button>
		</div>
	);
}
