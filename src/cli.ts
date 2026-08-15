#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedProject } from '@packkit/core/node';
import { generate } from './generate.js';
import { PRESETS, PRESET_INFO, PRESET_NAMES, PRESET_ALIASES, resolvePreset } from './presets.js';
import { PackkitGoError } from './errors.js';
import type { GoConfigInput } from './types.js';

function selfVersion(): string {
	try {
		const pkg = JSON.parse(
			readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
		);
		return pkg.version ?? '0.0.0';
	} catch {
		return '0.0.0';
	}
}

const HELP = `create-packkit-go — scaffold a modern Go project (go.mod module, idiomatic layout, table tests)

Usage:
  npx create-packkit-go <preset> <name> [options]

Presets:
${PRESET_NAMES.map((n) => `  ${n.padEnd(8)} ${PRESET_INFO[n]}`).join('\n')}
  aliases: ${Object.entries(PRESET_ALIASES)
		.map(([a, p]) => `${a}→${p}`)
		.join('  ')}

Options:
  --name <name>          Project name (or first/second positional)
  --module <path>        go.mod module path (default: sanitized name)
  --description <text>
  --author "<name> <email>"
  --license <MIT|none>   (default: MIT)
  --go <1.x>             Minimum Go version (default: 1.23)
  --release <none|goreleaser>  GoReleaser config + tag-triggered release workflow (default: none)
  --here                 Scaffold into the current directory
  --force                Overwrite existing files
  -h, --help             Show this help          -v, --version`;

function run(argv: string[]): void {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			name: { type: 'string' },
			module: { type: 'string' },
			description: { type: 'string' },
			author: { type: 'string' },
			license: { type: 'string' },
			go: { type: 'string' },
			release: { type: 'string' },
			here: { type: 'boolean' },
			force: { type: 'boolean' },
			help: { type: 'boolean', short: 'h' },
			version: { type: 'boolean', short: 'v' },
		},
	});

	if (values.help) return void console.log(HELP);
	if (values.version) return void console.log(selfVersion());

	const pos = [...positionals];
	let presetToken: string | undefined;
	const at = pos.findIndex((p) => resolvePreset(p));
	if (at !== -1) presetToken = pos.splice(at, 1)[0];
	const name = values.name ?? pos.shift();
	if (pos.length)
		throw new PackkitGoError(
			'UNKNOWN_ARG',
			`Unrecognized argument "${pos[0]}". Run \`create-packkit-go --help\`.`,
		);
	if (!name)
		throw new PackkitGoError(
			'MISSING_NAME',
			'A project name is required, e.g. `create-packkit-go go-lib my-lib`.',
		);

	const canonical = presetToken ? resolvePreset(presetToken) : undefined;
	const input: GoConfigInput = {
		...(canonical ? PRESETS[canonical] : {}),
		name,
		...(values.module != null ? { module: values.module } : {}),
		...(values.description != null ? { description: values.description } : {}),
		...(values.author != null ? { author: values.author } : {}),
		...(values.license != null ? { license: values.license } : {}),
		...(values.go != null ? { goVersion: values.go } : {}),
		...(values.release != null ? { release: values.release as GoConfigInput['release'] } : {}),
	};

	const project = generate(input, { preset: canonical, version: selfVersion() });
	const dir = values.here ? '.' : project.config.name;
	const { written, skipped } = writeGeneratedProject(dir, project.files, { force: !!values.force });

	console.log(
		`Created ${project.config.name} (${project.summary.target}) — ${written.length} files in ${dir === '.' ? 'the current directory' : `${dir}/`}`,
	);
	if (skipped.length)
		console.log(
			`Skipped ${skipped.length} existing file(s): ${skipped.join(', ')} (use --force to overwrite)`,
		);
	console.log('\nNext:');
	if (dir !== '.') console.log(`  cd ${dir}`);
	console.log('  go test ./...');
	console.log('  go build ./...');
}

try {
	run(process.argv.slice(2));
} catch (err) {
	if (err instanceof PackkitGoError) {
		console.error(`✖ ${err.message}`);
		process.exit(1);
	}
	throw err;
}
