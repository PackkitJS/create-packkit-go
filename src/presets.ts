import type { GoConfigInput } from './types.js';

// Presets are partial configs applied over the defaults: `create-packkit-go go-lib my-lib`.
export const PRESETS: Record<string, GoConfigInput> = {
	'go-lib': { target: 'library' },
};

export const PRESET_NAMES = Object.keys(PRESETS);

export const PRESET_ALIASES: Record<string, string> = {
	lib: 'go-lib',
};

export const PRESET_INFO: Record<string, string> = {
	'go-lib': 'Go library module — go.mod, idiomatic package layout, a table-driven test.',
};

/** Resolve a preset name or alias to its canonical id (or undefined). */
export function resolvePreset(name: string | undefined): string | undefined {
	if (!name) return undefined;
	if (PRESETS[name]) return name;
	if (PRESET_ALIASES[name]) return PRESET_ALIASES[name];
	return undefined;
}
