import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	dts: false,
	deps: {
		// Vercel's deployed function doesn't resolve any node_modules deps at
		// runtime (Bun's node_modules layout isn't traced), so every dependency
		// must be inlined into the bundle.
		alwaysBundle: () => true,
	},
});
