import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@verzel/ui/components/table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteCombo } from "@/api/requests/combos/delete-combo";
import { getMyCombos } from "@/api/requests/combos/get-my-combos";
import type { Combo } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/combos/")({
	component: CombosListComponent,
	beforeLoad: () => requireRole("organizador"),
});

function CombosListComponent() {
	const [combos, setCombos] = useState<Combo[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyCombos(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar seus combos.");
				return;
			}
			setCombos(response);
		})();
		return () => controller.abort();
	}, []);

	async function handleDelete(comboId: string) {
		setPendingId(comboId);
		const [, deleteError] = await tryCatch(deleteCombo(comboId));
		setPendingId(null);

		if (deleteError) {
			toast.error("Não foi possível excluir o combo.");
			return;
		}

		setCombos(
			(current) => current?.filter((combo) => combo.id !== comboId) ?? null,
		);
		toast.success("Combo excluído.");
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!combos) return <Loader />;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Combos</h1>
				<Link to="/organizer/combos/new">
					<Button>Criar combo</Button>
				</Link>
			</div>

			{combos.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Você ainda não criou nenhum combo.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead>Preço</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{combos.map((combo) => (
							<TableRow key={combo.id}>
								<TableCell>{combo.name}</TableCell>
								<TableCell>{combo.description}</TableCell>
								<TableCell>{formatPriceCents(combo.priceCents)}</TableCell>
								<TableCell>
									<Badge variant={combo.active ? "default" : "secondary"}>
										{combo.active ? "Ativo" : "Inativo"}
									</Badge>
								</TableCell>
								<TableCell className="flex justify-end gap-2 text-right">
									<Link
										to="/organizer/combos/$comboId/edit"
										params={{ comboId: combo.id }}
									>
										<Button variant="outline" size="sm">
											Editar
										</Button>
									</Link>
									<AlertDialog>
										<AlertDialogTrigger
											render={
												<Button
													variant="destructive"
													size="sm"
													disabled={pendingId === combo.id}
												/>
											}
										>
											Excluir
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Excluir combo</AlertDialogTitle>
												<AlertDialogDescription>
													Tem certeza que deseja excluir o combo "{combo.name}
													"? Essa ação não pode ser desfeita.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancelar</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={() => handleDelete(combo.id)}
												>
													Excluir
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
