export const CUSTOMER_CANCELLATION_CUTOFF_MINUTES = 120;

export function customerCancellationDeadline(sessionAt: Date): Date {
	return new Date(
		sessionAt.getTime() - CUSTOMER_CANCELLATION_CUTOFF_MINUTES * 60_000,
	);
}
