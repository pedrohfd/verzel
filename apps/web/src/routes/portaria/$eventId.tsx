import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Ban, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { validateTicketCode } from "@/api/requests/checkin/validate-ticket-code";
import type { CheckinResult } from "@/api/types";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/portaria/$eventId")({
	component: PortariaScanComponent,
	beforeLoad: () => requireRole("portaria"),
});

const resultLabel: Record<CheckinResult["result"], string> = {
	valid: "Ingresso válido",
	invalid: "Código inválido",
	already_used: "Ingresso já utilizado",
	wrong_event: "Ingresso de outra sessão",
};

function resultBadgeVariant(result: CheckinResult["result"]) {
	if (result === "valid") return "default" as const;
	return "destructive" as const;
}

function PortariaScanComponent() {
	const { eventId } = Route.useParams();
	const [manualCode, setManualCode] = useState("");
	const [isChecking, setIsChecking] = useState(false);
	const [result, setResult] = useState<CheckinResult | null>(null);
	const [isPaused, setIsPaused] = useState(false);
	const isCheckingRef = useRef(false);
	const resultRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		isCheckingRef.current = isChecking;
	}, [isChecking]);

	useEffect(() => {
		if (result)
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [result]);

	async function handleValidate(code: string) {
		if (!code.trim() || isCheckingRef.current) return;

		setIsPaused(true);
		setIsChecking(true);
		const [response, error] = await tryCatch(
			validateTicketCode(eventId, code.trim()),
		);
		setIsChecking(false);

		if (error) {
			setResult({ result: "invalid" });
			return;
		}

		setResult(response);
	}

	function handleScanNext() {
		setResult(null);
		setManualCode("");
		setIsPaused(false);
	}

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Validar ingresso</h1>

			<Scanner
				onScan={(codes) => handleValidate(codes[0]?.rawValue ?? "")}
				onError={(error) => console.error("[qr-scanner]", error.message)}
				formats={["qr_code"]}
				paused={isPaused}
				classNames={{ container: "mb-6" }}
			/>

			<div className="mb-6 flex flex-col gap-2">
				<Label htmlFor="manual-code">Ou digite o código manualmente</Label>
				<div className="flex gap-2">
					<Input
						id="manual-code"
						value={manualCode}
						onChange={(e) => setManualCode(e.target.value)}
						placeholder="ticketId.eventId.issuedAt.assinatura"
					/>
					<Button
						disabled={isChecking}
						onClick={() => handleValidate(manualCode)}
					>
						Validar
					</Button>
				</div>
			</div>

			{result && (
				<div
					ref={resultRef}
					className="flex flex-col items-center gap-2 border border-border p-4"
				>
					{result.result === "valid" && (
						<CheckCircle2 className="zoom-in-50 fade-in size-12 animate-in text-green-600 duration-300 dark:text-green-500" />
					)}

					{result.result === "already_used" && (
						<Ban className="size-12 animate-shake text-amber-600 dark:text-amber-500" />
					)}

					<Badge variant={resultBadgeVariant(result.result)} className="w-fit">
						{resultLabel[result.result]}
					</Badge>

					{result.result === "valid" && (
						<div className="text-sm">
							<p>{result.movieTitle}</p>
							<p>Assento {result.seatLabel}</p>
							<p>{result.customerName}</p>
						</div>
					)}

					{result.result === "already_used" && (
						<p className="text-muted-foreground text-sm">
							Utilizado em{" "}
							{new Date(result.checkedInAt).toLocaleString("pt-BR")}
						</p>
					)}

					{result.result === "wrong_event" && (
						<p className="text-muted-foreground text-sm">
							Este ingresso pertence a outra sessão.
						</p>
					)}

					<Button onClick={handleScanNext} className="w-fit">
						Escanear próximo
					</Button>
				</div>
			)}
		</div>
	);
}
