import { PackkitGoError } from './errors.js';
import { modulePath } from './naming.js';
import type { GoConfig, GoConfigInput, GoRelease, GoTarget } from './types.js';

const TARGETS: GoTarget[] = ['library', 'cli', 'worker', 'service'];
const LICENSES = ['MIT', 'none'];
const RELEASES: GoRelease[] = ['none', 'goreleaser'];

export function defaultConfig(): GoConfig {
	return {
		name: 'app',
		description: '',
		author: '',
		license: 'MIT',
		goVersion: '1.23',
		target: 'library',
		module: '',
		release: 'none',
	};
}

/** Validate + fill an input into a complete config. Throws PackkitGoError on invalid input. */
export function normalizeConfig(input: GoConfigInput): GoConfig {
	if (!input.name)
		throw new PackkitGoError(
			'MISSING_NAME',
			'A project name is required, e.g. `create-packkit-go go-lib my-lib`.',
		);
	const cfg: GoConfig = { ...defaultConfig(), name: input.name };

	for (const key of ['description', 'author'] as const) {
		if (input[key] != null) cfg[key] = input[key] as string;
	}
	if (input.goVersion != null) cfg.goVersion = String(input.goVersion);
	if (input.target != null) {
		if (!TARGETS.includes(input.target)) {
			throw new PackkitGoError(
				'INVALID_TARGET',
				`Unknown target "${input.target}". Expected one of: ${TARGETS.join(', ')}.`,
			);
		}
		cfg.target = input.target;
	}
	if (input.license != null) {
		if (!LICENSES.includes(input.license)) {
			throw new PackkitGoError(
				'INVALID_LICENSE',
				`Unknown license "${input.license}". Expected one of: ${LICENSES.join(', ')}.`,
			);
		}
		cfg.license = input.license;
	}
	if (input.release != null) {
		if (!RELEASES.includes(input.release)) {
			throw new PackkitGoError(
				'INVALID_RELEASE',
				`Unknown release "${input.release}". Expected one of: ${RELEASES.join(', ')}.`,
			);
		}
		cfg.release = input.release;
	}
	if (input.module != null) cfg.module = String(input.module);
	if (!cfg.module) cfg.module = modulePath(cfg.name);

	if (!/^\d+\.\d+$/.test(cfg.goVersion)) {
		throw new PackkitGoError(
			'INVALID_GO_VERSION',
			`"${cfg.goVersion}" is not a supported Go version (expected e.g. 1.23).`,
		);
	}
	return cfg;
}
