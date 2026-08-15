import type { GoConfig } from './types.js';

// The language-neutral checklist capabilities (@packkit/core GENERATOR_CHECKLIST),
// realized the Go way: editor config (tabs for *.go), CI (gofmt/vet/build/test),
// Dependabot (gomod), community health files, and an agent guide. Emitted for every
// project so Go is a first-class Packkit citizen, never an afterthought.
export function scaffoldFiles(cfg: GoConfig): Record<string, string> {
	return {
		'.editorconfig': editorConfig(),
		'.github/workflows/ci.yml': ciWorkflow(cfg),
		'.github/dependabot.yml': dependabot(),
		'AGENTS.md': agents(),
		'CLAUDE.md': 'See [AGENTS.md](./AGENTS.md) for build/test commands and conventions.\n',
		'CONTRIBUTING.md': contributing(),
		'CODE_OF_CONDUCT.md': codeOfConduct(),
		'SECURITY.md': security(),
		'.github/ISSUE_TEMPLATE/bug_report.md': bugReport(),
		'.github/ISSUE_TEMPLATE/feature_request.md': featureRequest(),
		'.github/PULL_REQUEST_TEMPLATE.md': prTemplate(),
	};
}

function editorConfig(): string {
	return [
		'root = true',
		'',
		'[*]',
		'charset = utf-8',
		'end_of_line = lf',
		'insert_final_newline = true',
		'trim_trailing_whitespace = true',
		'',
		'[*.go]',
		'indent_style = tab',
		'',
		'[*.{json,yml,yaml,md}]',
		'indent_style = space',
		'indent_size = 2',
		'',
	].join('\n');
}

function ciWorkflow(cfg: GoConfig): string {
	return [
		'name: CI',
		'on:',
		'  push:',
		'    branches: [main]',
		'  pull_request:',
		'jobs:',
		'  ci:',
		'    runs-on: ubuntu-latest',
		'    steps:',
		'      - uses: actions/checkout@v4',
		'      - uses: actions/setup-go@v5',
		'        with:',
		`          go-version: '${cfg.goVersion}'`,
		'      - name: Check formatting',
		'        run: test -z "$(gofmt -l .)" || { gofmt -l .; exit 1; }',
		'      - run: go vet ./...',
		'      - run: go build ./...',
		'      - run: go test ./...',
		'',
	].join('\n');
}

function dependabot(): string {
	return [
		'version: 2',
		'updates:',
		'  - package-ecosystem: gomod',
		'    directory: /',
		'    schedule:',
		'      interval: weekly',
		'  - package-ecosystem: github-actions',
		'    directory: /',
		'    schedule:',
		'      interval: weekly',
		'',
	].join('\n');
}

function agents(): string {
	return [
		'# Agent guide',
		'',
		'Commands for working in this project:',
		'',
		'```sh',
		'go build ./...   # build',
		'go test ./...    # test',
		'go vet ./...     # vet',
		'gofmt -l .       # list unformatted files (should be empty)',
		'```',
		'',
		'Keep changes idiomatic; run `gofmt`, `go vet`, and `go test` before opening a PR.',
		'',
	].join('\n');
}

function contributing(): string {
	return [
		'# Contributing',
		'',
		'Thanks for your interest in contributing!',
		'',
		'## Development',
		'',
		'```sh',
		'go test ./...',
		'go build ./...',
		'go vet ./...',
		'```',
		'',
		'## Pull requests',
		'',
		'- Create a branch, make your change, and open a PR against `main`.',
		'- Make sure the code is `gofmt`-clean and `go vet`/tests pass.',
		'',
	].join('\n');
}

function codeOfConduct(): string {
	return [
		'# Code of Conduct',
		'',
		'This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).',
		'By participating, you are expected to uphold this code. Report unacceptable',
		'behavior to the maintainers.',
		'',
	].join('\n');
}

function security(): string {
	return [
		'# Security Policy',
		'',
		'If you discover a security vulnerability, please **do not** open a public issue.',
		'Instead, report it privately to the maintainers (e.g. via GitHub Security',
		'Advisories). We will respond as quickly as possible.',
		'',
	].join('\n');
}

function bugReport(): string {
	return [
		'---',
		'name: Bug report',
		'about: Report a problem',
		'labels: bug',
		'---',
		'',
		'**Describe the bug**',
		'',
		'**To reproduce**',
		'',
		'**Expected behavior**',
		'',
		'**Environment**',
		'- Version:',
		'- Go:',
		'- OS:',
		'',
	].join('\n');
}

function featureRequest(): string {
	return [
		'---',
		'name: Feature request',
		'about: Suggest an idea',
		'labels: enhancement',
		'---',
		'',
		'**Problem**',
		'',
		'**Proposed solution**',
		'',
		'**Alternatives considered**',
		'',
	].join('\n');
}

function prTemplate(): string {
	return [
		'## Summary',
		'',
		'<!-- What does this change and why? -->',
		'',
		'## Checklist',
		'',
		'- [ ] Tests pass',
		'- [ ] `gofmt`-clean and `go vet` passes',
		'- [ ] Docs updated if needed',
		'',
	].join('\n');
}
