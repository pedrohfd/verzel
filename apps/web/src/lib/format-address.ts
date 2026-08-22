export interface CinemaAddress {
	street: string;
	number: string;
	complement?: string | null;
	neighborhood: string;
	city: string;
	state: string;
}

export function formatAddress(cinema: CinemaAddress) {
	const complement = cinema.complement ? `, ${cinema.complement}` : "";
	return `${cinema.street}, ${cinema.number}${complement} - ${cinema.neighborhood}, ${cinema.city}/${cinema.state}`;
}
