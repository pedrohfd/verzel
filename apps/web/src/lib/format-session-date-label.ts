const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function formatSessionDateLabel(date: Date, now = new Date()) {
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const weekday = isSameDay(date, now)
		? "HOJE"
		: isSameDay(date, tomorrow)
			? "AMANHÃ"
			: WEEKDAYS[date.getDay()];

	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");

	return { weekday, date: `${day}/${month}` };
}
