import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loader from "./loader";

describe("Loader", () => {
	it("renders a spinning indicator", () => {
		const { container } = render(<Loader />);

		expect(container.querySelector(".animate-spin")).toBeInTheDocument();
	});
});
