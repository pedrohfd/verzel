import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { BRAZILIAN_STATES, isValidCnpj } from "@verzel/shared/validators";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { toast } from "sonner";
import z from "zod";
import { registerCinema } from "@/api/requests/cinemas/register-cinema";
import { authClient } from "@/lib/auth-client";
import { maskCep, maskCnpj, maskUf } from "@/lib/masks";
import { tryCatch } from "@/lib/try-catch";

import Loader from "../ui/loader";

export default function CinemaRegisterForm() {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			cinemaName: "",
			cnpj: "",
			zipCode: "",
			street: "",
			number: "",
			complement: "",
			neighborhood: "",
			city: "",
			state: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: async () => {
						const [, error] = await tryCatch(
							registerCinema({
								cinemaName: value.cinemaName,
								cnpj: value.cnpj,
								zipCode: value.zipCode,
								street: value.street,
								number: value.number,
								complement: value.complement,
								neighborhood: value.neighborhood,
								city: value.city,
								state: value.state,
							}),
						);

						if (error) {
							toast.error("Não foi possível concluir o cadastro do cinema.");
							return;
						}

						navigate({ to: "/organizer" });
						toast.success("Cadastro do cinema realizado com sucesso");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
				email: z.email("Endereço de e-mail inválido"),
				password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
				cinemaName: z
					.string()
					.min(2, "O nome do cinema deve ter no mínimo 2 caracteres"),
				cnpj: z.string().refine(isValidCnpj, "CNPJ inválido"),
				zipCode: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
				street: z.string().min(1, "Informe a rua"),
				number: z.string().min(1, "Informe o número"),
				complement: z.string(),
				neighborhood: z.string().min(1, "Informe o bairro"),
				city: z.string().min(1, "Informe a cidade"),
				state: z.enum(BRAZILIAN_STATES, "Selecione uma UF válida"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">
				Cadastro de cinema
			</h1>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Nome do responsável</Label>
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
				</div>

				<div>
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
				</div>

				<div>
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
				</div>

				<div>
					<form.Field name="cinemaName">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Nome do cinema/rede</Label>
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
				</div>

				<div>
					<form.Field name="cnpj">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>CNPJ</Label>
								<Input
									id={field.name}
									name={field.name}
									inputMode="numeric"
									maxLength={18}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(maskCnpj(e.target.value))}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="zipCode">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>CEP</Label>
								<Input
									id={field.name}
									name={field.name}
									inputMode="numeric"
									maxLength={9}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(maskCep(e.target.value))}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div className="flex gap-4">
					<div className="flex-1">
						<form.Field name="street">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Rua</Label>
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
					</div>

					<div className="w-24">
						<form.Field name="number">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Número</Label>
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
					</div>
				</div>

				<div>
					<form.Field name="complement">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Complemento</Label>
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
				</div>

				<div>
					<form.Field name="neighborhood">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Bairro</Label>
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
				</div>

				<div className="flex gap-4">
					<div className="flex-1">
						<form.Field name="city">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Cidade</Label>
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
					</div>

					<div className="w-24">
						<form.Field name="state">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Estado</Label>
									<Input
										id={field.name}
										name={field.name}
										maxLength={2}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(maskUf(e.target.value))}
									/>
									{field.state.meta.errors.map((error) => (
										<p key={error?.message} className="text-red-500">
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
					</div>
				</div>

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
							{isSubmitting ? "Enviando..." : "Cadastrar cinema"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
