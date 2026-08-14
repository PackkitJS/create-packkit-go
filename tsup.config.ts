import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

// The published version, injected at build time so the generator can report it
// WITHOUT reading package.json at runtime (node:fs) — that keeps the package
// browser-safe (bundleable by packkit-web). See __PACKKIT_GO_VERSION__.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	entry: ['src/index.ts', 'src/cli.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	define: { __PACKKIT_GO_VERSION__: JSON.stringify(version) },
});
