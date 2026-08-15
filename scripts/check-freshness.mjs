#!/usr/bin/env node
// "Dependabot for the templates" — Go edition. The generated projects are stdlib-only
// (no go.mod requires to track), so the freshness net checks the two upstream versions
// the generator BAKES INTO its output as strings — invisible to Dependabot/Renovate:
//
//   • the Go toolchain floor  — the `go 1.x` directive in go.mod and the `golang:1.x`
//     multi-stage build image, vs the latest stable Go release (go.dev).
//   • the distroless base tag — `gcr.io/distroless/static-debianNN`, vs the newest
//     debian generation distroless publishes.
//
// Values are read back out of freshly-generated files (never hard-coded here), so this
// can't drift from what the generator actually emits. Exit 1 if anything is stale.
import { generate } from '../dist/index.js';

// Deliberately held below latest (what -> reason). The Go module floor is intentionally
// conservative for broad compatibility, so we only flag it when egregiously behind.
const GO_MINORS_BEHIND_THRESHOLD = 4; // ~2 years of Go releases

// --- read what the generator emits ------------------------------------------
const svc = generate({ name: 'x', target: 'service' }, { preset: 'go-service' }).files;
const goMod = svc['go.mod'];
const dockerfile = svc['Dockerfile'];

const goFloor = goMod.match(/^go (\d+)\.(\d+)/m); // e.g. "go 1.23"
const golangImage = dockerfile.match(/FROM golang:(\d+)\.(\d+)/); // e.g. "FROM golang:1.23"
const distroless = dockerfile.match(/distroless\/[a-z]+-debian(\d+)/); // e.g. "static-debian12"

// --- fetch upstream latest --------------------------------------------------
async function latestGo() {
	try {
		const res = await fetch('https://go.dev/VERSION?m=text');
		if (!res.ok) return null;
		const m = (await res.text()).match(/go(\d+)\.(\d+)/); // "go1.26.6"
		return m ? { major: +m[1], minor: +m[2] } : null;
	} catch {
		return null;
	}
}

// Probe whether a newer distroless debian generation is PUBLISHED (best-effort).
// GCR resolves any well-formed path with a 200, so existence = a non-empty tag list
// (an unreleased generation like static-debian14 returns `{ tags: [] }`).
async function newerDistrolessDebian(current) {
	for (let gen = current + 1; gen <= current + 2; gen++) {
		try {
			const res = await fetch(`https://gcr.io/v2/distroless/static-debian${gen}/tags/list`);
			if (!res.ok) continue;
			const body = await res.json();
			if (Array.isArray(body.tags) && body.tags.length > 0) return gen;
		} catch {
			/* unreachable — skip */
		}
	}
	return null;
}

const stale = [];
const latest = await latestGo();

if (goFloor && latest) {
	const floorMinor = +goFloor[2];
	const behind = latest.major > +goFloor[1] ? Infinity : latest.minor - floorMinor;
	console.log(
		`Go floor: 1.${floorMinor} · build image: golang:${golangImage ? `${golangImage[1]}.${golangImage[2]}` : '?'} · latest stable: ${latest.major}.${latest.minor}`,
	);
	if (behind >= GO_MINORS_BEHIND_THRESHOLD) {
		stale.push(
			`Go toolchain floor \`1.${floorMinor}\` is ${behind === Infinity ? 'a MAJOR' : `${behind} minors`} behind latest \`${latest.major}.${latest.minor}\` — bump the \`goVersion\` default in src/options.ts.`,
		);
	}
} else if (!latest) {
	console.log(
		'Could not resolve the latest Go version from go.dev (skipping the toolchain check).',
	);
}

if (distroless) {
	const gen = +distroless[1];
	const newer = await newerDistrolessDebian(gen);
	console.log(
		`distroless base: static-debian${gen}${newer ? ` (debian${newer} now published)` : ' (current)'}`,
	);
	if (newer) {
		stale.push(
			`Distroless base \`static-debian${gen}\` is behind — \`static-debian${newer}\` is published. Bump it in src/generate.ts (worker/service Dockerfile).`,
		);
	}
}

if (stale.length === 0) {
	console.log('\n✅ Go toolchain floor and distroless base are current.');
	process.exit(0);
}
console.log(`\n⚠️  ${stale.length} template version${stale.length === 1 ? '' : 's'} behind:\n`);
for (const s of stale) console.log(`  - ${s}`);
process.exit(1);
