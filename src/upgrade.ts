// Baseline-aware upgrade for Go projects. The universal file three-way lives in
// @packkit/core (computeProjectUpgrade); this generator only adds the go.mod
// structural diff (plan.manifest) and returns the common UpgradeResult envelope, so
// a host consumes a Go upgrade exactly like a JS or Python one.
import { computeProjectUpgrade, summarizeFileUpgrade } from '@packkit/core';
import type { GeneratedProject, ProjectDefinition, UpgradeResult } from '@packkit/core';
import { generate } from './generate.js';
import { readBaseline } from './baseline.js';
import { goModDiffer } from './manifest-differ.js';
import type { GoConfigInput } from './types.js';

export interface UpgradeInput {
	definition: ProjectDefinition;
	currentFiles: Record<string, string>;
	version?: string;
}

export function upgradeProject(input: UpgradeInput): UpgradeResult {
	const { definition, currentFiles } = input;
	const generated = generate(definition.config as GoConfigInput, {
		preset: definition.preset,
		version: input.version,
	});
	const baseline = readBaseline(currentFiles['packkit.json']);

	// packkit.json is provenance (it carries the baseline) — regenerated, not diffed.
	const generatedFiles = { ...generated.files };
	delete generatedFiles['packkit.json'];

	const { plan, patch } = computeProjectUpgrade({
		generatedFiles,
		currentFiles,
		baselineFileHashes: baseline?.files,
	});

	const manifest = goModDiffer.diff({
		baseline: baseline?.goMod as unknown as Record<string, unknown> | undefined,
		current: goModDiffer.parse(currentFiles['go.mod'] ?? ''),
		generated: goModDiffer.parse(generated.files['go.mod'] ?? ''),
	});

	const summary = summarizeFileUpgrade(plan);
	return {
		generatedProject: {
			...generated,
			config: generated.config as unknown as Record<string, unknown>,
		} as GeneratedProject,
		plan: { ...plan, manifest },
		patch,
		diagnostics: generated.diagnostics,
		metadata: {
			fromVersion: definition.generator?.version,
			toVersion: input.version,
			baselineAvailable: plan.baselineAvailable,
			hasConflicts: summary.conflicts > 0,
			hasSafeChanges: summary.safeChanges > 0,
		},
	};
}
