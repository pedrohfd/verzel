export const MAX_ROWS = 20;
export const MAX_COLUMNS = 24;

export function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

export function isValidCnpj(value: string): boolean {
	const digits = onlyDigits(value);

	if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
		return false;
	}

	const calculateDigit = (base: string) => {
		const weights =
			base.length === 12
				? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
				: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

		const sum = base
			.split("")
			.reduce((acc, digit, i) => acc + Number(digit) * (weights[i] ?? 0), 0);

		const remainder = sum % 11;
		return remainder < 2 ? 0 : 11 - remainder;
	};

	const firstDigit = calculateDigit(digits.slice(0, 12));
	const secondDigit = calculateDigit(digits.slice(0, 12) + firstDigit);

	return digits.slice(12) === `${firstDigit}${secondDigit}`;
}

export const BRAZILIAN_STATES = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
] as const;
