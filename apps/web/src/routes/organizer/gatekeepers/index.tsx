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

import { deleteGatekeeper } from "@/api/requests/gatekeepers/delete-gatekeeper";
import { getMyGatekeepers } from "@/api/requests/gatekeepers/get-my-gatekeepers";
import type { Gatekeeper } from "@/api/types";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/gatekeepers/")({
	component: GatekeepersListComponent,
	beforeLoad: () => requireRole("organizador"),
});

function GatekeepersListComponent() {
	const [gatekeepers, setGatekeepers] = useState<Gatekeeper[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyGatekeepers(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar seus porteiros.");
				return;
			}
			setGatekeepers(response);
		})();
		return () => controller.abort();
	}, []);

	async function handleDelete(gatekeeperId: string) {
		setPendingId(gatekeeperId);
		const [, deleteError] = await tryCatch(deleteGatekeeper(gatekeeperId));
		setPendingId(null);

		if (deleteError) {
			toast.error("Não foi possível excluir o porteiro.");
			return;
		}

		setGatekeepers(
			(current) =>
				current?.filter((gatekeeper) => gatekeeper.id !== gatekeeperId) ?? null,
		);
		toast.success("Porteiro excluído.");
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!gatekeepers) return <Loader />;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Porteiros</h1>
				<Link to="/organizer/gatekeepers/new">
					<Button>Cadastrar porteiro</Button>
				</Link>
			</div>

			{gatekeepers.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Você ainda não cadastrou nenhum porteiro.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>E-mail</TableHead>
							<TableHead>Criado em</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{gatekeepers.map((gatekeeper) => (
							<TableRow key={gatekeeper.id}>
								<TableCell>{gatekeeper.name}</TableCell>
								<TableCell>{gatekeeper.email}</TableCell>
								<TableCell>
									{new Date(gatekeeper.createdAt).toLocaleDateString("pt-BR")}
								</TableCell>
								<TableCell className="flex justify-end gap-2 text-right">
									<AlertDialog>
										<AlertDialogTrigger
											render={
												<Button
													variant="destructive"
													size="sm"
													disabled={pendingId === gatekeeper.id}
												/>
											}
										>
											Excluir
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Excluir porteiro</AlertDialogTitle>
												<AlertDialogDescription>
													Tem certeza que deseja excluir o porteiro "
													{gatekeeper.name}"? Essa ação não pode ser desfeita.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancelar</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={() => handleDelete(gatekeeper.id)}
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
