// Public API for create-packkit-go — a JS generator whose output is a Go project.
// Consumed by the CLI, the (future) web configurator, and the shared packkit-mcp
// server, exactly as create-packkit / create-packkit-py are.
export { generate } from './generate.js';
export { normalizeConfig, defaultConfig } from './options.js';
export { PRESETS, PRESET_NAMES, PRESET_ALIASES, PRESET_INFO, resolvePreset } from './presets.js';
export { modulePath, packageName } from './naming.js';
export { deriveDeploymentContract } from './deployment.js';
export { PackkitGoError } from './errors.js';
export { GENERATOR_ID } from './constants.js';
// create-packkit-go as a @packkit/core PackkitGenerator (the platform interface).
export { goGenerator } from './generator.js';
export { goModDiffer } from './manifest-differ.js';
export type { GoMod, GoModSnapshot, GoModDiff, RequireAddition } from './manifest-differ.js';
export { buildBaseline, readBaseline } from './baseline.js';
export type { Baseline } from './baseline.js';
export { upgradeProject } from './upgrade.js';
export type { UpgradeInput } from './upgrade.js';
export type { UpgradeResult } from '@packkit/core';
export type * from './types.js';
