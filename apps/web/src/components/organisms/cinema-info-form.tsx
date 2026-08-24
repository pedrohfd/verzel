import { useForm } from "@tanstack/react-form";
import { BRAZILIAN_STATES, isValidCnpj } from "@verzel/shared/validators";
import { Button } from "@verzel/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@verzel/ui/components/card";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getAddressByCep } from "@/api/requests/cinemas/get-address-by-cep";
import { updateMyProfile } from "@/api/requests/users/update-my-profile";
import type { MyProfile } from "@/api/types";
import { maskCep, maskCnpj, maskUf } from "@/lib/masks";
import { tryCatch } from "@/lib/try-catch";

export default function CinemaInfoForm({
	profile,
	onSaved,
}: {
	profile: MyProfile;
	onSaved: (updated: MyProfile) => void;
}) {
	const [isFetchingAddress, setIsFetchingAddress] = useState(false);
	const lastLookedUpCepRef = useRef<string | null>(null);

	const form = useForm({
		defaultValues: {
			cinemaName: profile.cinemaName ?? "",
			cnpj: profile.cnpj ? maskCnpj(profile.cnpj) : "",
			zipCode: profile.zipCode ? maskCep(profile.zipCode) : "",
			street: profile.street ?? "",
			number: profile.number ?? "",
			complement: profile.complement ?? "",
			neighborhood: profile.neighborhood ?? "",
			city: profile.city ?? "",
			state: profile.state ?? "",
		},
		onSubmit: async ({ value }) => {
			const [updated, error] = await tryCatch(
				updateMyProfile({
					name: profile.name,
					email: profile.email,
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
				toast.error("Não foi possível atualizar os dados do cinema.");
				return;
			}

			toast.success("Dados do cinema atualizados com sucesso");
			onSaved(updated);
		},
		validators: {
			onSubmit: z.object({
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

	return (
		<Card>
			<CardHeader>
				<CardTitle>Dados do cinema</CardTitle>
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
									onBlur={async () => {
										field.handleBlur();

										const digits = field.state.value.replace(/\D/g, "");
										if (digits.length !== 8) return;
										if (digits === lastLookedUpCepRef.current) return;

										setIsFetchingAddress(true);
										const [data, error] = await tryCatch(
											getAddressByCep(digits),
										);
										setIsFetchingAddress(false);

										if (error) {
											toast.error(
												"Não foi possível encontrar o endereço para o CEP informado.",
											);
											return;
										}

										lastLookedUpCepRef.current = digits;
										form.setFieldValue("street", data.logradouro);
										form.setFieldValue("neighborhood", data.bairro);
										form.setFieldValue("city", data.localidade);
										form.setFieldValue("state", data.uf);
									}}
									onChange={(e) => field.handleChange(maskCep(e.target.value))}
								/>
								{isFetchingAddress && (
									<p className="text-muted-foreground text-sm">
										Buscando endereço...
									</p>
								)}
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-red-500">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<div className="flex gap-4">
						<div className="flex-1">
							<form.Field name="street">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Rua</Label>
										<Input
											id={field.name}
											name={field.name}
											disabled={isFetchingAddress}
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

					<form.Field name="neighborhood">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Bairro</Label>
								<Input
									id={field.name}
									name={field.name}
									disabled={isFetchingAddress}
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

					<div className="flex gap-4">
						<div className="flex-1">
							<form.Field name="city">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Cidade</Label>
										<Input
											id={field.name}
											name={field.name}
											disabled={isFetchingAddress}
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
											disabled={isFetchingAddress}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(maskUf(e.target.value))
											}
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
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{isSubmitting ? "Salvando..." : "Salvar dados do cinema"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
