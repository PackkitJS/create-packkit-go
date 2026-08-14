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

	// The logic always lives in a testable package at the module root; a CLI adds a
	// thin cmd/ main that wires it to flags (idiomatic Go — keep main minimal).
	const files: Record<string, string> = {
		'go.mod': goMod(config),
		[`${pkg}.go`]: libGo(config, pkg),
		[`${pkg}_test.go`]: libTestGo(pkg),
		'README.md': readme(config, pkg),
		'.gitignore': gitignore(),
	};
	if (config.target === 'cli') files[`cmd/${pkg}/main.go`] = cliMainGo(config, pkg);
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

// A thin command that keeps zero logic of its own: it parses a flag (or a positional
// arg) and delegates to the library package, so the behavior stays unit-tested there.
function cliMainGo(cfg: GoConfig, pkg: string): string {
	return [
		`// Command ${pkg} greets a name from the command line.`,
		'package main',
		'',
		'import (',
		'\t"flag"',
		'\t"fmt"',
		'\t"os"',
		'',
		`\t"${cfg.module}"`,
		')',
		'',
		'func main() {',
		'\tname := flag.String("name", "world", "who to greet")',
		'\tflag.Parse()',
		'\t// A positional argument wins over the flag: `' + pkg + ' Alice`.',
		'\tif flag.NArg() > 0 {',
		'\t\t*name = flag.Arg(0)',
		'\t}',
		`\tfmt.Fprintln(os.Stdout, ${pkg}.Greet(*name))`,
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

function readme(cfg: GoConfig, pkg: string): string {
	const lines = [
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
	];
	if (cfg.target === 'cli') {
		lines.push(
			'## Run',
			'',
			'```sh',
			`go run ./cmd/${pkg} Alice   # or: --name Alice`,
			`go install ./cmd/${pkg}     # installs the ${pkg} binary`,
			'```',
			'',
		);
	} else {
		lines.push('## Use', '', '```go', `import "${cfg.module}"`, '```', '');
	}
	return lines.join('\n');
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
