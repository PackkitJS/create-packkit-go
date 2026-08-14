import { PACKKIT_PROTOCOL_VERSION } from '@packkit/core';
import type { GeneratedGoProject, GoConfig, GoConfigInput } from './types.js';
import { GENERATOR_ID, PROVENANCE_SCHEMA_VERSION } from './constants.js';
import { normalizeConfig } from './options.js';
import { packageName } from './naming.js';
import { provenance } from './provenance.js';
import { buildBaseline } from './baseline.js';
import { deriveDeploymentContract } from './deployment.js';
import { licenseText } from './license.js';

/** Generate a Go project in memory. Deterministic: same config → same bytes. */
export function generate(
	input: GoConfigInput,
	options: { preset?: string; version?: string } = {},
): GeneratedGoProject {
	const config = normalizeConfig(input);
	const pkg = packageName(config.name);

	const files: Record<string, string> = {
		'go.mod': goMod(config),
		[`${pkg}.go`]: libGo(config, pkg),
		[`${pkg}_test.go`]: libTestGo(pkg),
		'README.md': readme(config),
		'.gitignore': gitignore(),
	};
	if (config.license !== 'none')
		files['LICENSE'] = licenseText(config.license as 'MIT', authorName(config.author));

	const baseline = buildBaseline(files);
	files['packkit.json'] = provenance(config, {
		preset: options.preset,
		version: options.version,
		baseline,
	});

	return {
		config,
		files,
		diagnostics: [],
		metadata: {
			generatorId: GENERATOR_ID,
			generatorVersion: options.version,
			protocolVersion: PACKKIT_PROTOCOL_VERSION,
			schemaVersion: PROVENANCE_SCHEMA_VERSION,
			preset: options.preset,
		},
		deploymentContract: deriveDeploymentContract(config),
		summary: {
			modulePath: config.module,
			packageName: pkg,
			target: config.target,
			fileCount: Object.keys(files).length,
		},
	};
}

// "DanMat <dan@example.com>" → "DanMat"
function authorName(author: string): string {
	return author.replace(/<[^>]*>/, '').trim() || 'The authors';
}

// A Go package comment must start with "Package <name>" (go vet), so the sentence is
// lowercased and appended.
function packageSummary(cfg: GoConfig): string {
	const s = cfg.description?.trim() || 'provides a friendly greeting.';
	const lowered = s.charAt(0).toLowerCase() + s.slice(1);
	return lowered.endsWith('.') ? lowered : `${lowered}.`;
}

function goMod(cfg: GoConfig): string {
	return `module ${cfg.module}\n\ngo ${cfg.goVersion}\n`;
}

function libGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Package ${pkg} ${packageSummary(cfg)}`,
		`package ${pkg}`,
		'',
		'// Greet returns a friendly greeting for name.',
		'func Greet(name string) string {',
		'\treturn "Hello, " + name + "!"',
		'}',
		'',
	].join('\n');
}

function libTestGo(pkg: string): string {
	return [
		`package ${pkg}`,
		'',
		'import "testing"',
		'',
		'func TestGreet(t *testing.T) {',
		'\tgot := Greet("world")',
		'\twant := "Hello, world!"',
		'\tif got != want {',
		'\t\tt.Errorf("Greet(%q) = %q, want %q", "world", got, want)',
		'\t}',
		'}',
		'',
	].join('\n');
}

function readme(cfg: GoConfig): string {
	return [
		`# ${cfg.name}`,
		'',
		`> ${cfg.description || 'A modern Go module scaffolded with [create-packkit-go](https://github.com/PackkitJS/create-packkit-go).'}`,
		'',
		'## Develop',
		'',
		'```sh',
		'go test ./...',
		'go build ./...',
		'go vet ./...',
		'```',
		'',
		'## Use',
		'',
		'```go',
		`import "${cfg.module}"`,
		'```',
		'',
	].join('\n');
}

function gitignore(): string {
	return [
		'# Binaries',
		'*.exe',
		'*.dll',
		'*.so',
		'*.dylib',
		'',
		'# Test binary / coverage',
		'*.test',
		'*.out',
		'coverage.txt',
		'',
		'# Go workspace file',
		'go.work',
		'go.work.sum',
		'',
		'# Vendored dependencies',
		'/vendor/',
		'',
	].join('\n');
}
