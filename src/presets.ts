import type { GoConfigInput } from './types.js';

// Presets are partial configs applied over the defaults: `create-packkit-go go-lib my-lib`.
export const PRESETS: Record<string, GoConfigInput> = {
	'go-lib': { target: 'library' },
	'go-cli': { target: 'cli' },
	'go-worker': { target: 'worker' },
	'go-service': { target: 'service' },
};

export const PRESET_NAMES = Object.keys(PRESETS);

export const PRESET_ALIASES: Record<string, string> = {
	lib: 'go-lib',
	cli: 'go-cli',
	worker: 'go-worker',
	service: 'go-service',
	svc: 'go-service',
};

export const PRESET_INFO: Record<string, string> = {
	'go-lib': 'Go library module — go.mod, idiomatic package layout, a table-driven test.',
	'go-cli': 'Go command — everything in go-lib plus a cmd/ main that wires the package to flags.',
	'go-worker':
		'Go background worker — a testable handler seam, a runner that drains on SIGTERM and exits 0, JSON logs, Dockerfile.',
	'go-service':
		'Go HTTP service — net/http server, PORT env, /healthz, graceful shutdown, a handler test, distroless Dockerfile.',
};

/** Resolve a preset name or alias to its canonical id (or undefined). */
export function resolvePreset(name: string | undefined): string | undefined {
	if (!name) return undefined;
	if (PRESETS[name]) return name;
	if (PRESET_ALIASES[name]) return PRESET_ALIASES[name];
	return undefined;
}
