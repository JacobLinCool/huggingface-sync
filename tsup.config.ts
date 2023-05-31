import { defineConfig } from "tsup";

export default defineConfig(() => ({
	entry: ["src/index.ts"],
	outDir: "dist",
	target: "node16",
	shims: true,
	clean: true,
	splitting: false,
	minify: false,
	bundle: true,
	skipNodeModulesBundle: false,
	dts: false,
}));
