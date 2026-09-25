export const CUSTOMER_CANCELLATION_CUTOFF_MINUTES = 120;

export function customerCancellationDeadline(sessionAt: Date): Date {
	return new Date(
		sessionAt.getTime() - CUSTOMER_CANCELLATION_CUTOFF_MINUTES * 60_000,
	);
}

export const VALIDATION_OPENS_MINUTES_BEFORE = 60;

export function validationOpensAt(sessionAt: Date): Date {
	return new Date(
		sessionAt.getTime() - VALIDATION_OPENS_MINUTES_BEFORE * 60_000,
	);
}
