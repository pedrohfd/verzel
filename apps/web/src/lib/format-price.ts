export function formatPriceCents(priceCents: number) {
	return (priceCents / 100).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}
