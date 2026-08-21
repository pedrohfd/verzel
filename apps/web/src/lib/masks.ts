export function maskCnpj(value: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 14);

	return digits
		.replace(/^(\d{2})(\d)/, "$1.$2")
		.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
		.replace(/\.(\d{3})(\d)/, ".$1/$2")
		.replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCep(value: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 8);

	return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskCurrencyBRL(value: string): string {
	const digits = value.replace(/\D/g, "");

	if (!digits) {
		return "";
	}

	const cents = digits.padStart(3, "0");
	const integer = cents.slice(0, -2).replace(/^0+(?=\d)/, "");
	const decimals = cents.slice(-2);

	return `${integer},${decimals}`;
}

export function maskUf(value: string): string {
	return value
		.replace(/[^a-zA-Z]/g, "")
		.toUpperCase()
		.slice(0, 2);
}
