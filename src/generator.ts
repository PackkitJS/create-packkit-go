import { PACKKIT_PROTOCOL_VERSION, extendGeneratedProject } from '@packkit/core';
import type {
	GeneratedProject,
	GeneratedProjectExtension,
	GeneratorSchema,
	ManifestDiffer,
	PackkitGenerator,
	PresetDescriptor,
	ProjectDefinition,
} from '@packkit/core';
import { GENERATOR_ID, PROVENANCE_SCHEMA_VERSION } from './constants.js';
import { PRESETS, PRESET_INFO, PRESET_NAMES, resolvePreset } from './presets.js';
import { generate } from './generate.js';
import { goModDiffer } from './manifest-differ.js';
import { upgradeProject, type UpgradeInput } from './upgrade.js';
import type { GoConfigInput } from './types.js';

// Injected at build time by tsup/vitest `define` (see tsup.config.ts): browser-safe,
// no node:fs at runtime.
declare const __PACKKIT_GO_VERSION__: string;
const VERSION = typeof __PACKKIT_GO_VERSION__ === 'string' ? __PACKKIT_GO_VERSION__ : '0.0.0';

// create-packkit-go implemented as a @packkit/core PackkitGenerator. Go's manifest
// (go.mod) semantics stay behind its ManifestDiffer; core stays language-neutral.
export const goGenerator: PackkitGenerator = {
	id: GENERATOR_ID,
	language: 'go',
	version: VERSION,
	maturity: 'experimental',
	protocol: {
		version: PACKKIT_PROTOCOL_VERSION,
		capabilities: ['generate', 'deployment-contract', 'project-definition', 'baseline-upgrade'],
	},

	// go.mod semantics as a ManifestDiffer (its own richer Diff shape → widen).
	manifestDiffers: [goModDiffer as unknown as ManifestDiffer],

	listPresets(): PresetDescriptor[] {
		return PRESET_NAMES.map((id) => ({
			id,
			description: PRESET_INFO[id],
			maturity: 'experimental',
		}));
	},

	getSchema(): GeneratorSchema {
		return {
			schemaVersion: PROVENANCE_SCHEMA_VERSION,
			generatorId: GENERATOR_ID,
			options: [
				{ id: 'name', description: 'Project name (also the default module path)' },
				{ id: 'module', description: 'go.mod module path, e.g. github.com/you/name' },
				{ id: 'description' },
				{ id: 'author', description: '"Name <email>"' },
				{ id: 'license', choices: ['MIT', 'Apache-2.0', 'ISC', 'none'], default: 'MIT' },
				{ id: 'target', choices: ['library', 'cli', 'worker', 'service'], default: 'library' },
				{ id: 'goVersion', default: '1.23', description: 'Minimum Go version (go.mod directive)' },
				{
					id: 'release',
					choices: ['none', 'goreleaser'],
					default: 'none',
					description: 'GoReleaser config + tag-triggered release workflow',
				},
			],
		};
	},

	createProject(input): GeneratedProject {
		const { preset, name, config } = (input ?? {}) as {
			preset?: string;
			name?: string;
			config?: GoConfigInput;
		};
		const canonical = preset ? resolvePreset(preset) : undefined;
		const goInput: GoConfigInput = {
			...(canonical ? PRESETS[canonical] : {}),
			...(config ?? {}),
			...(name ? { name } : {}),
		};
		const project = generate(goInput, { preset: canonical, version: VERSION });
		return { ...project, config: project.config as unknown as Record<string, unknown> };
	},

	exportDefinition(project): ProjectDefinition {
		return {
			schemaVersion: PROVENANCE_SCHEMA_VERSION,
			protocolVersion: PACKKIT_PROTOCOL_VERSION,
			generator: { id: GENERATOR_ID, version: VERSION },
			preset: project.metadata.preset,
			config: project.config,
			extensions: project.extensions,
		};
	},

	createProjectFromDefinition(definition): GeneratedProject {
		const project = generate(definition.config as GoConfigInput, {
			preset: definition.preset,
			version: VERSION,
		});
		const base: GeneratedProject = {
			...project,
			config: project.config as unknown as Record<string, unknown>,
		};
		const ext = definition.extensions as GeneratedProjectExtension | undefined;
		return ext?.files ? extendGeneratedProject(base, { files: ext.files }).project : base;
	},

	upgradeProject(input) {
		return upgradeProject({ ...(input as UpgradeInput), version: VERSION });
	},
};
