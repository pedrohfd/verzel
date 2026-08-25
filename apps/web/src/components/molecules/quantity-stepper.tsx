import { Button } from "@verzel/ui/components/button";
import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({
	value,
	onChange,
	label,
}: {
	value: number;
	onChange: (value: number) => void;
	label: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="icon-xs"
				aria-label={`Diminuir quantidade de ${label}`}
				disabled={value === 0}
				onClick={() => onChange(Math.max(0, value - 1))}
			>
				<Minus />
			</Button>
			<span className="w-4 text-center font-semibold text-sm">{value}</span>
			<Button
				type="button"
				variant="outline"
				size="icon-xs"
				aria-label={`Aumentar quantidade de ${label}`}
				onClick={() => onChange(value + 1)}
			>
				<Plus />
			</Button>
		</div>
	);
}
