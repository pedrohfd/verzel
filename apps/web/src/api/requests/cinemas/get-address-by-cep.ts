export interface ViaCepResponse {
	cep: string;
	logradouro: string;
	complemento: string;
	bairro: string;
	localidade: string;
	uf: string;
	erro?: true;
}

export async function getAddressByCep(cep: string): Promise<ViaCepResponse> {
	const digits = cep.replace(/\D/g, "");
	const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

	if (!response.ok) {
		throw new Error("Falha ao buscar o endereço pelo CEP.");
	}

	const data: ViaCepResponse = await response.json();

	if (data.erro) {
		throw new Error("CEP não encontrado.");
	}

	return data;
}
