import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

const { parsed } = loadDotenv({ path: ".env.test" });

export default defineConfig({
	test: {
		environment: "node",
		env: parsed,
		exclude: ["**/node_modules/**", "**/dist/**"],
		coverage: {
			provider: "v8",
			enabled: true,
			reporter: ["text", "html", "lcov"],
			include: ["src/lib/**/*.ts", "src/routes/**/*.ts"],
			exclude: [
				"src/index.ts",
				"src/app.ts",
				"src/test-helpers/**",
				"**/*.test.ts",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
