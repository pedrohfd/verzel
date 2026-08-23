import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

afterEach(() => {
	cleanup();
});

if (!window.matchMedia) {
	window.matchMedia = (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});
}

class MockObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (!window.ResizeObserver) {
	window.ResizeObserver = MockObserver;
}

if (!window.IntersectionObserver) {
	window.IntersectionObserver =
		MockObserver as unknown as typeof IntersectionObserver;
}
