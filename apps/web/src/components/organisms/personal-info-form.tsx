import { useForm } from "@tanstack/react-form";
import { Button } from "@verzel/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@verzel/ui/components/card";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import axios from "axios";
import { toast } from "sonner";
import { z } from "zod";

import { updateMyProfile } from "@/api/requests/users/update-my-profile";
import type { MyProfile } from "@/api/types";
import { authClient } from "@/lib/auth-client";
import { tryCatch } from "@/lib/try-catch";

export default function PersonalInfoForm({
	profile,
	onSaved,
}: {
	profile: MyProfile;
	onSaved: (updated: MyProfile) => void;
}) {
	const form = useForm({
		defaultValues: {
			name: profile.name,
			email: profile.email,
		},
		onSubmit: async ({ value }) => {
			const [updated, error] = await tryCatch(
				updateMyProfile({
					name: value.name,
					email: value.email,
					cinemaName: profile.cinemaName ?? undefined,
					cnpj: profile.cnpj ?? undefined,
					zipCode: profile.zipCode ?? undefined,
					street: profile.street ?? undefined,
					number: profile.number ?? undefined,
					complement: profile.complement ?? undefined,
					neighborhood: profile.neighborhood ?? undefined,
					city: profile.city ?? undefined,
					state: profile.state ?? undefined,
				}),
			);

			if (error) {
				const isEmailAlreadyInUse =
					axios.isAxiosError(error) &&
					error.response?.data?.code === "EMAIL_ALREADY_IN_USE";

				toast.error(
					isEmailAlreadyInUse
						? "Já existe um usuário com esse e-mail."
						: "Não foi possível atualizar seus dados.",
				);
				return;
			}

			authClient.updateUser({ name: value.name });
			toast.success("Dados atualizados com sucesso");
			onSaved(updated);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
				email: z.email("Endereço de e-mail inválido"),
			}),
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Dados pessoais</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Nome</Label>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>E-mail</Label>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => ({
							canSubmit: state.canSubmit,
							isSubmitting: state.isSubmitting,
						})}
					>
						{({ canSubmit, isSubmitting }) => (
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{isSubmitting ? "Salvando..." : "Salvar dados pessoais"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
