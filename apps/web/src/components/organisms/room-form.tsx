import { useForm } from "@tanstack/react-form";
import { MAX_COLUMNS, MAX_ROWS } from "@verzel/shared/validators";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { toast } from "sonner";
import { z } from "zod";

import { createRoom } from "@/api/requests/rooms/create-room";
import { updateRoom } from "@/api/requests/rooms/update-room";
import type { CinemaRoom } from "@/api/types";
import { tryCatch } from "@/lib/try-catch";

import CinemaRoomPreview from "./cinema-room-preview";

export default function RoomForm({
	room,
	onSaved,
}: {
	room?: CinemaRoom;
	onSaved: (room: CinemaRoom) => void;
}) {
	const isEditing = !!room;

	const form = useForm({
		defaultValues: {
			name: room?.name ?? "",
			rows: room ? String(room.rows) : "8",
			columns: room ? String(room.columns) : "10",
		},
		onSubmit: async ({ value }) => {
			const payload = {
				name: value.name,
				rows: Number(value.rows),
				columns: Number(value.columns),
			};

			const [result, error] = await tryCatch(
				isEditing ? updateRoom(room.id, payload) : createRoom(payload),
			);

			if (error) {
				toast.error(
					isEditing
						? "Não foi possível salvar as alterações."
						: "Não foi possível criar a sala.",
				);
				return;
			}

			toast.success(
				isEditing ? "Sala atualizada com sucesso." : "Sala criada com sucesso.",
			);
			onSaved(result);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "Informe um nome para a sala"),
				rows: z
					.string()
					.refine(
						(value) => Number(value) >= 1 && Number(value) <= MAX_ROWS,
						`Informe um número de fileiras entre 1 e ${MAX_ROWS}`,
					),
				columns: z
					.string()
					.refine(
						(value) => Number(value) >= 1 && Number(value) <= MAX_COLUMNS,
						`Informe um número de assentos por fileira entre 1 e ${MAX_COLUMNS}`,
					),
			}),
		},
	});

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:items-start">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-1 flex-col gap-4"
			>
				<form.Field name="name">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Nome da sala</Label>
							<Input
								id={field.name}
								placeholder="Sala 1"
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

				<div className="flex gap-4">
					<form.Field name="rows">
						{(field) => (
							<div className="flex flex-1 flex-col gap-2">
								<Label htmlFor={field.name}>Fileiras</Label>
								<Input
									id={field.name}
									type="number"
									min={1}
									max={MAX_ROWS}
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
					<form.Field name="columns">
						{(field) => (
							<div className="flex flex-1 flex-col gap-2">
								<Label htmlFor={field.name}>Assentos por fileira</Label>
								<Input
									id={field.name}
									type="number"
									min={1}
									max={MAX_COLUMNS}
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
				</div>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => {
						let label = isEditing ? "Salvar alterações" : "Criar sala";
						if (isSubmitting) label = isEditing ? "Salvando..." : "Criando...";
						return (
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{label}
							</Button>
						);
					}}
				</form.Subscribe>
			</form>

			<div className="flex flex-col gap-2 lg:flex-1">
				<Label>Pré-visualização da sala</Label>
				<form.Subscribe
					selector={(state) => ({
						rows: state.values.rows,
						columns: state.values.columns,
					})}
				>
					{({ rows, columns }) => (
						<CinemaRoomPreview rows={Number(rows)} columns={Number(columns)} />
					)}
				</form.Subscribe>
			</div>
		</div>
	);
}
