import { describe, it, expect } from 'vitest';
import { generate } from './generate.js';

// Focused unit tests for the release feature (the characterization snapshots cover the
// default, release-free output; these cover the additive --release=goreleaser branch).
describe('release: goreleaser', () => {
	it('is off by default — no release files', () => {
		const files = generate({ name: 'demo', target: 'cli' }).files;
		expect(Object.keys(files)).not.toContain('.goreleaser.yaml');
		expect(Object.keys(files)).not.toContain('.github/workflows/release.yml');
	});

	it('emits a GoReleaser config + a tag-triggered workflow for a binary target', () => {
		const files = generate({ name: 'demo', target: 'cli', release: 'goreleaser' }).files;
		const cfg = files['.goreleaser.yaml'] ?? '';
		expect(cfg).toContain('version: 2');
		expect(cfg).toContain('main: ./cmd/demo'); // builds the cmd binary
		expect(cfg).toContain('goos: [linux, darwin, windows]');
		expect(cfg).not.toContain('skip: true');

		const wf = files['.github/workflows/release.yml'] ?? '';
		expect(wf).toContain('goreleaser/goreleaser-action@v6');
		expect(wf).toContain('fetch-depth: 0'); // GoReleaser needs full history for the changelog
		expect(wf).toContain("go-version: '1.23'");
		expect(wf).not.toMatch(/GORELEASER_TOKEN|PERSONAL_ACCESS/); // default GITHUB_TOKEN only
	});

	it('releases a library in library-mode (skip the build — no binary to ship)', () => {
		const cfg = generate({ name: 'demo', target: 'library', release: 'goreleaser' }).files[
			'.goreleaser.yaml'
		];
		expect(cfg).toContain('skip: true');
		expect(cfg).not.toContain('goos:'); // no cross-compile matrix for a library
		expect(cfg).toContain('changelog:'); // still a changelog + GitHub Release
	});

	it('threads the configured Go version into the release workflow', () => {
		const wf = generate({ name: 'demo', target: 'cli', release: 'goreleaser', goVersion: '1.24' })
			.files['.github/workflows/release.yml'];
		expect(wf).toContain("go-version: '1.24'");
	});

	it('rejects an unknown release option', () => {
		expect(() => generate({ name: 'demo', release: 'bogus' as never })).toThrowError(
			/Unknown release "bogus"/,
		);
	});
});
