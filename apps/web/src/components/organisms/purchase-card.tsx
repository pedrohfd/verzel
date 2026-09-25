import { Link } from "@tanstack/react-router";
import { customerCancellationDeadline } from "@verzel/shared/session-rules";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@verzel/ui/components/alert-dialog";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Card, CardContent } from "@verzel/ui/components/card";

import type { MyPurchase, PurchaseTicket } from "@/api/types";
import { formatPriceCents } from "@/lib/format-price";
import {
	cancellationReasonLabel,
	ticketStatusBadge,
} from "@/lib/ticket-status";

type PurchaseCardProps = {
	purchase: MyPurchase;
	tickets?: PurchaseTicket[];
	onCancelTicket: (ticketId: string) => void;
};

export default function PurchaseCard({
	purchase,
	tickets = purchase.tickets,
	onCancelTicket,
}: PurchaseCardProps) {
	const sessionDate = new Date(purchase.event.sessionAt);
	const now = new Date();
	const hasStarted = sessionDate <= now;
	const cancellationClosed = now > customerCancellationDeadline(sessionDate);

	return (
		<Card className="gap-3 p-4">
			<CardContent className="flex flex-col gap-3 p-0">
				<div className="flex flex-col gap-1">
					<h3 className="font-semibold text-sm">{purchase.event.movieTitle}</h3>
					<p className="text-muted-foreground text-xs">
						{sessionDate.toLocaleString("pt-BR", {
							dateStyle: "short",
							timeStyle: "short",
						})}{" "}
						· {purchase.event.venueName}
					</p>
				</div>

				<ul className="flex flex-col gap-2">
					{tickets.map((ticket) => {
						const statusBadge = ticketStatusBadge(ticket.status);
						const isValid = ticket.status === "valid";
						const canCancel = isValid && !cancellationClosed;
						const showCutoffNotice =
							isValid && cancellationClosed && !hasStarted;

						return (
							<li
								key={ticket.id}
								data-testid="purchase-ticket"
								className="flex items-center justify-between gap-3"
							>
								<Link
									to="/tickets/$ticketId"
									params={{ ticketId: ticket.id }}
									className="flex flex-1 flex-col gap-0.5"
								>
									<span className="text-sm">
										Assento {ticket.seat.label} ·{" "}
										{formatPriceCents(ticket.priceCents)}
									</span>
									{ticket.cancellationReason && (
										<span className="text-muted-foreground text-xs">
											{cancellationReasonLabel(ticket.cancellationReason)}
										</span>
									)}
									{showCutoffNotice && (
										<span className="text-muted-foreground text-xs">
											Cancelamento só até 2h antes da sessão
										</span>
									)}
								</Link>
								<div className="flex items-center gap-2">
									<Badge variant={statusBadge.variant}>
										{statusBadge.label}
									</Badge>
									{canCancel && (
										<AlertDialog>
											<AlertDialogTrigger
												render={<Button variant="destructive" size="sm" />}
											>
												Cancelar
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Cancelar ingresso</AlertDialogTitle>
													<AlertDialogDescription>
														O assento {ticket.seat.label} voltará a ficar
														disponível e você receberá{" "}
														{formatPriceCents(ticket.priceCents)} de volta. Essa
														ação não pode ser desfeita.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Voltar</AlertDialogCancel>
													<AlertDialogAction
														variant="destructive"
														onClick={() => onCancelTicket(ticket.id)}
													>
														Cancelar ingresso
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									)}
								</div>
							</li>
						);
					})}
				</ul>

				{purchase.comboItems.length > 0 && (
					<ul className="flex flex-col gap-0.5 text-muted-foreground text-xs">
						{purchase.comboItems.map((item) => (
							<li key={item.id} className="flex flex-col">
								<span className="flex justify-between gap-2">
									<span>
										{item.quantity}x {item.comboName}
									</span>
									<span>{formatPriceCents(item.unitPriceCents)} cada</span>
								</span>
								{item.comboDescription && <span>{item.comboDescription}</span>}
							</li>
						))}
					</ul>
				)}

				<div className="flex flex-wrap justify-between gap-2 border-t pt-2 text-sm">
					<span>Pago: {formatPriceCents(purchase.amountCents)}</span>
					{purchase.refundedCents > 0 && (
						<span className="text-muted-foreground">
							Reembolsado: {formatPriceCents(purchase.refundedCents)}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
