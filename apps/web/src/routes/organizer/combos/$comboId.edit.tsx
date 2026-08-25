import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteCombo } from "@/api/requests/combos/delete-combo";
import { getMyCombos } from "@/api/requests/combos/get-my-combos";
import type { Combo } from "@/api/types";
import BackLink from "@/components/molecules/back-link";
import ComboForm from "@/components/organisms/combo-form";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/combos/$comboId/edit")({
	component: EditComboComponent,
	beforeLoad: () => requireRole("organizador"),
});

function EditComboComponent() {
	const { comboId } = Route.useParams();
	const navigate = useNavigate();

	const [combo, setCombo] = useState<Combo | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [combos, fetchError] = await tryCatch(
				getMyCombos(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar o combo.");
				return;
			}
			const found = combos.find((c) => c.id === comboId);
			if (!found) {
				setError("Combo não encontrado.");
				return;
			}
			setCombo(found);
		})();
		return () => controller.abort();
	}, [comboId]);

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
				<Link to="/organizer/combos" className="mt-4 inline-block">
					<Button variant="outline">Voltar</Button>
				</Link>
			</div>
		);
	}

	if (!combo) return <Loader />;

	async function handleDelete() {
		setDeleting(true);
		const [, deleteError] = await tryCatch(deleteCombo(comboId));
		setDeleting(false);

		if (deleteError) {
			toast.error("Não foi possível excluir o combo.");
			return;
		}

		toast.success("Combo excluído.");
		navigate({ to: "/organizer/combos" });
	}

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<BackLink to="/organizer/combos" label="Combos" />
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Editar combo</h1>
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button variant="destructive" size="sm" disabled={deleting} />
						}
					>
						Excluir combo
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Excluir combo</AlertDialogTitle>
							<AlertDialogDescription>
								Tem certeza que deseja excluir o combo "{combo.name}"? Essa ação
								não pode ser desfeita.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={handleDelete}>
								Excluir
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<ComboForm
				combo={combo}
				onSaved={() => navigate({ to: "/organizer/combos" })}
			/>
		</div>
	);
}
