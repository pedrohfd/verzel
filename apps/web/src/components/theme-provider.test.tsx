import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
	it("renders its children", () => {
		render(
			<ThemeProvider>
				<span>content</span>
			</ThemeProvider>,
		);

		expect(screen.getByText("content")).toBeInTheDocument();
	});
});
