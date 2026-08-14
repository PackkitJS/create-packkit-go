// Scaffold-time baseline stored in packkit.json: a content hash per generated file
// plus the go.mod structural snapshot. A later `upgrade` uses it to tell a template
// change from the user's own edit (three-way). Deterministic and version-independent.
import { contentHash } from '@packkit/core';
import { PROVENANCE_SCHEMA_VERSION } from './constants.js';
import { goModDiffer } from './manifest-differ.js';
import type { GoModSnapshot } from './manifest-differ.js';

export interface Baseline {
	schemaVersion: number;
	files: Record<string, { hash: string }>;
	goMod: GoModSnapshot;
}

const EMPTY_GO_MOD: GoModSnapshot = { module: '', goVersion: '', require: {} };

/** Build the baseline from a fully-generated file map (excluding packkit.json). */
export function buildBaseline(files: Record<string, string>): Baseline {
	const fileHashes: Record<string, { hash: string }> = {};
	for (const path of Object.keys(files).sort()) {
		if (path === 'packkit.json') continue;
		fileHashes[path] = { hash: contentHash(files[path] ?? '') };
	}
	const goMod = files['go.mod']
		? (goModDiffer.snapshot(goModDiffer.parse(files['go.mod'])) as unknown as GoModSnapshot)
		: EMPTY_GO_MOD;
	return { schemaVersion: PROVENANCE_SCHEMA_VERSION, files: fileHashes, goMod };
}

/** Read the baseline out of an on-disk packkit.json (or undefined if absent). */
export function readBaseline(packkitJson: string | undefined): Baseline | undefined {
	if (!packkitJson) return undefined;
	try {
		return (JSON.parse(packkitJson) as { baseline?: Baseline }).baseline;
	} catch {
		return undefined;
	}
}
