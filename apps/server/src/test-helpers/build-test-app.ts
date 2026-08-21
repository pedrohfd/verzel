import { buildApp } from "../app";

export function buildTestApp() {
	return buildApp({ origin: true, credentials: true }, { logger: false });
}
