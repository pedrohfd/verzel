function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesMovieSearch(title: string, search: string): boolean {
	const normalizedTitle = normalize(title);
	const tokens = normalize(search).split(/\s+/).filter(Boolean);

	return tokens.every((token) => normalizedTitle.includes(token));
}
