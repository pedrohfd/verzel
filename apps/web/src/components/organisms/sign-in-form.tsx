import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "../ui/loader";

const TEST_ACCOUNTS = [
	{ label: "Cliente 1", email: "cliente1.teste@verzel.app" },
	{ label: "Cliente 2", email: "cliente2.teste@verzel.app" },
	{ label: "Organizador", email: "organizador.teste@verzel.app" },
	{ label: "Portaria", email: "portaria.teste@verzel.app" },
];
const TEST_ACCOUNT_PASSWORD = "teste1234";

export default function SignInForm() {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const signIn = (email: string, password: string) =>
		authClient.signIn.email(
			{
				email,
				password,
			},
			{
				onSuccess: () => {
					navigate({
						to: "/",
					});
					toast.success("Login realizado com sucesso");
				},
				onError: (error) => {
					toast.error(error.error.message || error.error.statusText);
				},
			},
		);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await signIn(value.email, value.password);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Endereço de e-mail inválido"),
				password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">
				Bem-vindo de volta
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
							{isSubmitting ? "Enviando..." : "Entrar"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Link to="/register">
					<Button
						variant="link"
						className="text-indigo-600 hover:text-indigo-800"
					>
						Precisa de uma conta? Cadastre-se
					</Button>
				</Link>
			</div>

			<div className="mt-6 border-t pt-4">
				<p className="mb-2 text-center text-muted-foreground text-sm">
					Login rápido (teste)
				</p>
				<div className="grid grid-cols-2 gap-2">
					{TEST_ACCOUNTS.map((account) => (
						<Button
							key={account.email}
							type="button"
							variant="outline"
							onClick={() => signIn(account.email, TEST_ACCOUNT_PASSWORD)}
						>
							{account.label}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}
