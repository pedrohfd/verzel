export function parseNumberSearchParam(value: unknown): number | undefined {
	if (typeof value === "number") return value;
	if (typeof value === "string" && value !== "") return Number(value);
	return undefined;
}
