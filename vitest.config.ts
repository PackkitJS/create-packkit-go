import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Mirror tsup's build-time version injection so tests (which import src directly)
// see the same __PACKKIT_GO_VERSION__ the built package does.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	define: { __PACKKIT_GO_VERSION__: JSON.stringify(version) },
});
