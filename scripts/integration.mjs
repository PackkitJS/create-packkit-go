// End-to-end integration: scaffold each preset with the REAL built CLI, then run the
// generated Go project's own toolchain — gofmt (formatting), go vet (static checks),
// go build, go test. This is create-packkit-go's implementation of the same
// `test:integration` contract that PackkitJS/packkit-actions' generator-integration
// workflow invokes for every generator; the shared workflow only provisions Go (via
// setup-go) and stays language-agnostic.
//
// Requires `go` on PATH (the CI workflow installs it with setup-go: true).
// Usage: `node scripts/integration.mjs [preset...]`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const ALL_PRESETS = ['go-lib', 'go-cli', 'go-worker'];
const presets = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PRESETS;

// dist name for a project scaffolded as `<preset>-demo` (naming lowercases/hyphenates).
const distName = (preset) => `${preset}-demo`;
// the Go package identifier the scaffold derives from that name (lowercase alnum).
const pkgName = (preset) => distName(preset).replace(/[^a-z0-9]/g, '');

function sh(cmd, args, cwd) {
	process.stdout.write(`\n$ ${cmd} ${args.join(' ')}   (${cwd})\n`);
	execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

function integrate(preset) {
	const workdir = mkdtempSync(join(tmpdir(), `packkit-go-${preset}-`));
	const name = distName(preset);
	try {
		console.log(`\n=== integration: ${preset} → ${name} ===`);
		// 1. Scaffold with the real CLI (writes ./<name>/ under workdir).
		sh(process.execPath, [CLI, preset, name], workdir);
		const project = join(workdir, name);

		// 2. Run the generated project's own quality gate with the real Go toolchain.
		//    gofmt -l lists misformatted files; any output means it's not gofmt-clean.
		const unformatted = execFileSync('gofmt', ['-l', '.'], {
			cwd: project,
			encoding: 'utf8',
		}).trim();
		if (unformatted) throw new Error(`gofmt found unformatted files:\n${unformatted}`);
		console.log('  ✓ gofmt clean');
		sh('go', ['vet', './...'], project);
		sh('go', ['build', './...'], project);
		sh('go', ['test', './...'], project);

		// 3. For a CLI, the built command must actually run and greet.
		if (preset === 'go-cli') {
			const out = execFileSync('go', ['run', `./cmd/${pkgName(preset)}`, 'there'], {
				cwd: project,
				encoding: 'utf8',
			});
			if (!out.includes('Hello, there!')) {
				throw new Error(`CLI output did not greet as expected. Got: ${JSON.stringify(out)}`);
			}
			console.log(`  ✓ command greeted: ${out.trim()}`);
		}
		console.log(`=== ${preset}: PASS ===`);
	} finally {
		rmSync(workdir, { recursive: true, force: true });
	}
}

let failed = false;
for (const preset of presets) {
	try {
		integrate(preset);
	} catch (err) {
		failed = true;
		console.error(`\n✖ ${preset} FAILED: ${err.message}`);
	}
}
if (failed) {
	console.error('\nintegration: one or more presets failed');
	process.exit(1);
}
console.log('\nintegration: all presets passed');
