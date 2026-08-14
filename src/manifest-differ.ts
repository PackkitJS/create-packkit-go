// The go.mod ManifestDiffer — Go's manifest semantics as a first-class @packkit/core
// ManifestDiffer. Core does the file-level three-way diff; Go's module/go-version/
// require semantics live here, never in core (which knows nothing of go.mod). A tiny
// line parser is enough — go.mod's grammar is small and we emit it ourselves.
import { classifyChange } from '@packkit/core';
import type { ChangeClassification, ManifestDiffer } from '@packkit/core';

export interface GoMod {
	module: string;
	goVersion: string;
	require: Record<string, string>;
}

export interface GoModSnapshot {
	module: string;
	goVersion: string;
	require: Record<string, string>;
}

export interface RequireAddition {
	name: string;
	version: string;
	/** New template require → safe; re-adding one the user removed → not safe. */
	safeToApply: boolean;
}

export interface GoModDiff {
	addedRequires: RequireAddition[];
	goVersion?: ChangeClassification & { current: string; generated: string };
}

function parseGoMod(content: string): GoMod {
	const require: Record<string, string> = {};
	let module = '';
	let goVersion = '';
	let inRequire = false;
	for (const raw of content.split('\n')) {
		const line = raw.replace(/\/\/.*$/, '').trim();
		if (!line) continue;
		if (line.startsWith('module ')) module = line.slice('module '.length).trim();
		else if (line.startsWith('go ')) goVersion = line.slice('go '.length).trim();
		else if (line === 'require (') inRequire = true;
		else if (inRequire && line === ')') inRequire = false;
		else if (inRequire) {
			const [name, version] = line.split(/\s+/);
			if (name && version) require[name] = version;
		} else if (line.startsWith('require ')) {
			const [, name, version] = line.split(/\s+/);
			if (name && version) require[name] = version;
		}
	}
	return { module, goVersion, require };
}

function serializeGoMod(m: GoMod): string {
	const lines = [`module ${m.module}`, '', `go ${m.goVersion}`];
	const names = Object.keys(m.require).sort();
	if (names.length) {
		lines.push('', 'require (', ...names.map((n) => `\t${n} ${m.require[n]}`), ')');
	}
	return `${lines.join('\n')}\n`;
}

function snapshotOf(m: GoMod): GoModSnapshot {
	return { module: m.module, goVersion: m.goVersion, require: { ...m.require } };
}

export const goModDiffer: ManifestDiffer<GoMod, GoModDiff> = {
	filename: 'go.mod',
	parse: (content) => parseGoMod(content),
	serialize: (m) => serializeGoMod(m),
	snapshot: (m) => snapshotOf(m) as unknown as Record<string, unknown>,

	diff({ baseline, current, generated }) {
		const base = baseline as unknown as GoModSnapshot | undefined;
		const cur = new Set(Object.keys(current.require));
		const baseNames = new Set(Object.keys(base?.require ?? {}));
		const addedRequires: RequireAddition[] = Object.entries(generated.require)
			.filter(([name]) => !cur.has(name))
			.map(([name, version]) => ({ name, version, safeToApply: !baseNames.has(name) }));

		let goVersion: GoModDiff['goVersion'];
		if (current.goVersion !== generated.goVersion) {
			const b = base?.goVersion;
			goVersion = {
				current: current.goVersion,
				generated: generated.goVersion,
				...classifyChange({
					hasBaseline: b !== undefined,
					currentEqualsBaseline: current.goVersion === b,
					generatedEqualsBaseline: generated.goVersion === b,
				}),
			};
		}
		return { addedRequires, goVersion };
	},
};
