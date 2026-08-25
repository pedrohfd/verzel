import { useForm } from "@tanstack/react-form";
import { Button } from "@verzel/ui/components/button";
import { Checkbox } from "@verzel/ui/components/checkbox";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { Textarea } from "@verzel/ui/components/textarea";
import axios from "axios";
import { toast } from "sonner";
import { z } from "zod";

import { createCombo } from "@/api/requests/combos/create-combo";
import { updateCombo } from "@/api/requests/combos/update-combo";
import type { Combo } from "@/api/types";
import { tryCatch } from "@/lib/try-catch";

export default function ComboForm({
	combo,
	onSaved,
}: {
	combo?: Combo;
	onSaved: (combo: Combo) => void;
}) {
	const isEditing = !!combo;

	const form = useForm({
		defaultValues: {
			name: combo?.name ?? "",
			description: combo?.description ?? "",
			price: combo ? (combo.priceCents / 100).toFixed(2).replace(".", ",") : "",
			active: combo?.active ?? true,
		},
		onSubmit: async ({ value }) => {
			const payload = {
				name: value.name,
				description: value.description || null,
				priceCents: Math.round(Number(value.price.replace(",", ".")) * 100),
				active: value.active,
			};

			const [result, error] = await tryCatch(
				isEditing ? updateCombo(combo.id, payload) : createCombo(payload),
			);

			if (error) {
				const isDuplicateName =
					axios.isAxiosError(error) &&
					error.response?.data?.code === "DUPLICATE_COMBO_NAME";

				if (isDuplicateName) {
					toast.error("Você já tem um combo com esse nome.");
					return;
				}

				toast.error(
					isEditing
						? "Não foi possível salvar as alterações."
						: "Não foi possível criar o combo.",
				);
				return;
			}

			toast.success(
				isEditing
					? "Combo atualizado com sucesso."
					: "Combo criado com sucesso.",
			);
			onSaved(result);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "Informe um nome para o combo"),
				description: z.string(),
				price: z
					.string()
					.refine(
						(value) => Number(value.replace(",", ".")) > 0,
						"Informe um preço válido",
					),
				active: z.boolean(),
			}),
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="flex max-w-md flex-col gap-4"
		>
			<form.Field name="name">
				{(field) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor={field.name}>Nome do combo</Label>
						<Input
							id={field.name}
							placeholder="Combo Casal"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						{field.state.meta.errors.map((err) => (
							<p key={err?.message} className="text-destructive text-xs">
								{err?.message}
							</p>
						))}
					</div>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor={field.name}>Descrição</Label>
						<Textarea
							id={field.name}
							placeholder="Pipoca grande + 2 refrigerantes grandes"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="price">
				{(field) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor={field.name}>Preço (R$)</Label>
						<Input
							id={field.name}
							placeholder="44,90"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						{field.state.meta.errors.map((err) => (
							<p key={err?.message} className="text-destructive text-xs">
								{err?.message}
							</p>
						))}
					</div>
				)}
			</form.Field>

			<form.Field name="active">
				{(field) => (
					<Label className="flex items-center gap-2">
						<Checkbox
							checked={field.state.value}
							onCheckedChange={(checked) => field.handleChange(checked)}
						/>
						Combo ativo (visível para os clientes)
					</Label>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ canSubmit, isSubmitting }) => {
					let label = isEditing ? "Salvar alterações" : "Criar combo";
					if (isSubmitting) label = isEditing ? "Salvando..." : "Criando...";
					return (
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{label}
						</Button>
					);
				}}
			</form.Subscribe>
		</form>
	);
}
