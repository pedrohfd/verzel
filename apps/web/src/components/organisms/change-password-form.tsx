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
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

export default function ChangePasswordForm() {
	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		onSubmit: async ({ value, formApi }) => {
			await authClient.changePassword(
				{
					currentPassword: value.currentPassword,
					newPassword: value.newPassword,
					revokeOtherSessions: false,
				},
				{
					onSuccess: () => {
						toast.success("Senha alterada com sucesso");
						formApi.reset();
					},
					onError: (error) => {
						toast.error(
							error.error.message || "Não foi possível alterar a senha.",
						);
					},
				},
			);
		},
		validators: {
			onSubmit: z
				.object({
					currentPassword: z.string().min(1, "Informe a senha atual"),
					newPassword: z
						.string()
						.min(8, "A senha deve ter no mínimo 8 caracteres"),
					confirmNewPassword: z.string(),
				})
				.refine((data) => data.newPassword === data.confirmNewPassword, {
					message: "As senhas não coincidem",
					path: ["confirmNewPassword"],
				}),
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Trocar senha</CardTitle>
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
					<form.Field name="currentPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Senha atual</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
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

					<form.Field name="newPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Nova senha</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
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

					<form.Field name="confirmNewPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Confirmar nova senha</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
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
								{isSubmitting ? "Salvando..." : "Alterar senha"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
