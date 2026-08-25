import { cn } from "@verzel/ui/lib/utils";

const STEPS = [
	{ step: 1, label: "Sessão & Assentos" },
	{ step: 2, label: "Combo" },
	{ step: 3, label: "Pagamento" },
] as const;

export default function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
	return (
		<div className="mb-4 flex gap-2 border-b pb-4">
			{STEPS.map(({ step, label }) => (
				<span
					key={step}
					className={cn(
						"rounded-full border px-3 py-1 text-xs",
						step === current
							? "border-destructive text-destructive"
							: "border-border text-muted-foreground",
					)}
				>
					{step}.{label}
				</span>
			))}
		</div>
	);
}
