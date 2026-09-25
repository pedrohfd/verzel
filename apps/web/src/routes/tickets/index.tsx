import { createFileRoute } from "@tanstack/react-router";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMyPurchases } from "@/api/requests/purchases/get-my-purchases";
import { cancelTicket } from "@/api/requests/tickets/cancel-ticket";
import type { MyPurchase, Refund, TicketStatus } from "@/api/types";
import PurchaseCard from "@/components/organisms/purchase-card";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { ticketStatusOptions } from "@/lib/ticket-status";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/tickets/")({
	component: MyTicketsComponent,
	beforeLoad: () => requireRole("cliente"),
});

function applyRefund(purchase: MyPurchase, refund: Refund): MyPurchase {
	return {
		...purchase,
		refunds: [...purchase.refunds, refund],
		refundedCents: purchase.refundedCents + refund.amountCents,
		tickets: purchase.tickets.map((ticket) =>
			ticket.id === refund.ticketId
				? {
						...ticket,
						status: "cancelled",
						cancelledAt: refund.createdAt,
						cancellationReason: refund.reason,
					}
				: ticket,
		),
	};
}

function MyTicketsComponent() {
	const [purchases, setPurchases] = useState<MyPurchase[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyPurchases(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar seus ingressos.");
				return;
			}
			setPurchases(response);
		})();

		return () => controller.abort();
	}, []);

	if (error) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!purchases) return <Loader />;

	const handleCancelTicket = async (ticketId: string) => {
		const [refund, cancelError] = await tryCatch(cancelTicket(ticketId));
		if (cancelError) {
			toast.error("Não foi possível cancelar o ingresso.");
			return;
		}
		setPurchases(
			(current) =>
				current?.map((purchase) =>
					purchase.id === refund.purchaseId
						? applyRefund(purchase, refund)
						: purchase,
				) ?? null,
		);
		toast.success(
			`Ingresso cancelado. ${formatPriceCents(refund.amountCents)} serão devolvidos.`,
		);
	};

	const filteredPurchases = purchases
		.map((purchase) => ({
			purchase,
			tickets:
				statusFilter === "all"
					? purchase.tickets
					: purchase.tickets.filter((ticket) => ticket.status === statusFilter),
		}))
		.filter(({ tickets }) => tickets.length > 0);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Meus Ingressos</h1>

			{purchases.length > 0 && (
				<div className="mb-4">
					<Select
						value={statusFilter}
						onValueChange={(value) => {
							if (!value) return;
							setStatusFilter(value as TicketStatus | "all");
						}}
						items={[
							{ value: "all", label: "Todos os status" },
							...ticketStatusOptions,
						]}
					>
						<SelectTrigger className="w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos os status</SelectItem>
							{ticketStatusOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{purchases.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Você ainda não tem ingressos.
				</p>
			)}

			{purchases.length > 0 && filteredPurchases.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Nenhum ingresso encontrado para o filtro selecionado.
				</p>
			)}

			<div className="flex flex-col gap-3">
				{filteredPurchases.map(({ purchase, tickets }) => (
					<PurchaseCard
						key={purchase.id}
						purchase={purchase}
						tickets={tickets}
						onCancelTicket={handleCancelTicket}
					/>
				))}
			</div>
		</div>
	);
}
