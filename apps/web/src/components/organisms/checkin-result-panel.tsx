import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Ban, CheckCircle2, Clock } from "lucide-react";

import type { CheckinResult } from "@/api/types";

const resultLabel: Record<CheckinResult["result"], string> = {
	valid: "Ingresso válido",
	invalid: "Código inválido",
	already_used: "Ingresso já utilizado",
	wrong_event: "Ingresso de outra sessão",
	cancelled: "Ingresso cancelado",
	expired: "Ingresso expirado",
	too_early: "Cedo demais",
};

function resultBadgeVariant(result: CheckinResult["result"]) {
	if (result === "valid") return "default" as const;
	if (result === "too_early") return "secondary" as const;
	return "destructive" as const;
}

function formatDateTime(iso: string) {
	return new Date(iso).toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});
}

type CheckinResultPanelProps = {
	result: CheckinResult;
	onScanNext: () => void;
};

export default function CheckinResultPanel({
	result,
	onScanNext,
}: CheckinResultPanelProps) {
	return (
		<div className="flex flex-col items-center gap-2 border border-border p-4">
			{result.result === "valid" && (
				<CheckCircle2 className="zoom-in-50 fade-in size-12 animate-in text-green-600 duration-300 dark:text-green-500" />
			)}

			{result.result === "already_used" && (
				<Ban className="size-12 animate-shake text-amber-600 dark:text-amber-500" />
			)}

			{result.result === "too_early" && (
				<Clock className="size-12 text-amber-600 dark:text-amber-500" />
			)}

			{(result.result === "cancelled" || result.result === "expired") && (
				<Ban className="size-12 text-destructive" />
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
					Utilizado em {new Date(result.checkedInAt).toLocaleString("pt-BR")}
					{result.checkedInBy && ` por ${result.checkedInBy}`}
				</p>
			)}

			{result.result === "wrong_event" && (
				<p className="text-muted-foreground text-sm">
					Este ingresso pertence a outra sessão.
				</p>
			)}

			{result.result === "cancelled" && (
				<p className="text-muted-foreground text-sm">
					{result.reason === "event_cancelled"
						? "Sessão cancelada pelo cinema em "
						: "Cancelado pelo cliente em "}
					{new Date(result.cancelledAt).toLocaleString("pt-BR")}
				</p>
			)}

			{result.result === "expired" && (
				<p className="text-muted-foreground text-sm">
					A sessão terminou em{" "}
					{new Date(result.sessionEndedAt).toLocaleString("pt-BR")}
				</p>
			)}

			{result.result === "too_early" && (
				<p className="text-muted-foreground text-sm">
					A validação abre em {formatDateTime(result.opensAt)}
				</p>
			)}

			<Button onClick={onScanNext} className="w-fit">
				Escanear próximo
			</Button>
		</div>
	);
}
