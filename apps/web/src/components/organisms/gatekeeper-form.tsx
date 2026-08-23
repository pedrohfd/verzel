import { useForm } from "@tanstack/react-form";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import axios from "axios";
import { toast } from "sonner";
import { z } from "zod";

import { createGatekeeper } from "@/api/requests/gatekeepers/create-gatekeeper";
import { tryCatch } from "@/lib/try-catch";

export default function GatekeeperForm({ onSaved }: { onSaved: () => void }) {
	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			const [, error] = await tryCatch(createGatekeeper(value));

			if (error) {
				const isEmailAlreadyInUse =
					axios.isAxiosError(error) &&
					error.response?.data?.code === "EMAIL_ALREADY_IN_USE";

				if (isEmailAlreadyInUse) {
					toast.error("Já existe um usuário com esse e-mail.");
					return;
				}

				toast.error("Não foi possível cadastrar o porteiro.");
				return;
			}

			toast.success("Porteiro cadastrado com sucesso");
			onSaved();
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
				email: z.email("Endereço de e-mail inválido"),
				password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
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
			className="mx-auto max-w-md space-y-4"
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

			<form.Field name="password">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Senha</Label>
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
					<Button
						type="submit"
						className="w-full"
						disabled={!canSubmit || isSubmitting}
					>
						{isSubmitting ? "Cadastrando..." : "Cadastrar porteiro"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
