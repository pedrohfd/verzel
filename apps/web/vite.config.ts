/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		coverage: {
			provider: "v8",
			enabled: true,
			reporter: ["text", "html", "lcov"],
			include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
			exclude: [
				"src/routeTree.gen.ts",
				"src/lib/auth-client.ts",
				"src/**/*.d.ts",
				"**/*.test.ts",
				"**/*.test.tsx",
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
