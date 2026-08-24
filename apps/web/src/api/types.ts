export interface EnrichedMovie {
	id: number;
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	genre: string | null;
	runtime: number | null;
	certification: string;
	audio: "Dublado";
}

export interface MovieTrailer {
	key: string;
	name: string;
}

export interface MovieDetails {
	genre: string | null;
	runtime: number | null;
	certification: string;
	overview: string;
	director: string | null;
	cast: string[];
}

export interface TmdbMovie {
	id: number;
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	release_date: string;
	vote_average: number;
}

export type EventStatus = "draft" | "published" | "cancelled";
export type ReservationStatus = "holding" | "paid" | "expired" | "cancelled";
export type PaymentStatus = "pending" | "approved" | "declined";

export interface VerzelEvent {
	id: string;
	organizerId: string;
	tmdbMovieId: number;
	movieTitle: string;
	moviePosterPath: string | null;
	movieBackdropPath: string | null;
	sessionAt: string;
	venueName: string;
	venueAddress: string;
	priceCents: number;
	roomId: string | null;
	roomName?: string | null;
	rows: number;
	columns: number;
	status: EventStatus;
	createdAt: string;
	updatedAt: string;
}

export interface Gatekeeper {
	id: string;
	name: string;
	email: string;
	createdAt: string;
}

export interface CinemaRoom {
	id: string;
	organizerId: string;
	name: string;
	rows: number;
	columns: number;
	createdAt: string;
	updatedAt: string;
}

export interface Seat {
	id?: string;
	eventId: string;
	row: number;
	column: number;
	label: string;
	status: "available" | "taken";
}

export interface Reservation {
	id: string;
	eventId: string;
	seatId: string;
	customerId: string;
	status: ReservationStatus;
	holdExpiresAt: string | null;
	createdAt: string;
	updatedAt: string;
	seat: {
		id: string;
		eventId: string;
		row: number;
		column: number;
		label: string;
	};
}

export interface Payment {
	id: string;
	reservationId: string;
	amountCents: number;
	method: string;
	status: PaymentStatus;
	processedAt: string | null;
	createdAt: string;
}

export interface Ticket {
	id: string;
	reservationId: string;
	eventId: string;
	seatId: string;
	shareToken: string;
	signature: string;
	issuedAt: string;
	checkedInAt: string | null;
	checkedInByUserId: string | null;
	cancelledAt: string | null;
	createdAt: string;
}

export interface TicketWithCode extends Ticket {
	code: string;
}

export interface MyTicket {
	id: string;
	status: ReservationStatus;
	ticket: Ticket | null;
	event: VerzelEvent;
	seat: Seat;
}

export interface TicketDetail extends TicketWithCode {
	event: VerzelEvent;
	seat: Seat;
}

export interface SharedTicket {
	movieTitle: string;
	moviePosterPath: string | null;
	sessionAt: string;
	venueName: string;
	venueAddress: string;
	seatLabel: string;
	checkedInAt: string | null;
	cancelledAt: string | null;
	code: string;
}

export type CheckinResult =
	| {
			result: "valid";
			seatLabel: string;
			movieTitle: string;
			customerName: string;
	  }
	| { result: "invalid" }
	| { result: "already_used"; checkedInAt: string; checkedInBy: string | null }
	| { result: "wrong_event"; ticketEventId: string }
	| { result: "cancelled"; cancelledAt: string };
