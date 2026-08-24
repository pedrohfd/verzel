import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { Html5QrcodeScanner } from "html5-qrcode";
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

const SCANNER_ELEMENT_ID = "qr-scanner";

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
	const scannerRef = useRef<Html5QrcodeScanner | null>(null);
	const isCheckingRef = useRef(false);

	useEffect(() => {
		isCheckingRef.current = isChecking;
	}, [isChecking]);

	async function handleValidate(code: string) {
		if (!code.trim() || isCheckingRef.current) return;

		try {
			scannerRef.current?.pause(true);
		} catch {}
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
		try {
			scannerRef.current?.resume();
		} catch {}
	}

	useEffect(() => {
		const scanner = new Html5QrcodeScanner(
			SCANNER_ELEMENT_ID,
			{ fps: 10, qrbox: 250 },
			false,
		);
		scannerRef.current = scanner;

		scanner.render(
			(decodedText) => handleValidate(decodedText),
			() => {},
		);

		return () => {
			scanner.clear().catch(() => {});
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [eventId]);

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Validar ingresso</h1>

			<div id={SCANNER_ELEMENT_ID} className="mb-6" />

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
				<div className="flex flex-col items-center gap-2 border border-border p-4">
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
