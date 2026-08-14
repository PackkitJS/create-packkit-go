# AGENTS.md

Guidance for AI coding agents working in **create-packkit-go**.

## What this is

A **JavaScript generator whose output is a Go project**. Same engine pattern as
`create-packkit` / `create-packkit-py`: a deterministic core, presets, a
`packkit.json` provenance file, and a `@packkit/core` `PackkitGenerator`
implementation (`goGenerator`). No Go toolchain is needed to _generate_ — only to
run what's generated.

## Stack

- Language: TypeScript (strict)
- Module format: ESM
- Package manager: npm
- Bundler: tsup
- Tests: vitest
- Lint/format: eslint-prettier

## Commands

- Type-check: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm test`
- Build: `npm run build`
- Full gate: `npm run check`
- E2E (needs Go on PATH): `npm run test:integration`

## Conventions

- Source lives in `src/`. Keep the public API in `src/index.ts`.
- The generator is `goGenerator` in `src/generator.ts`; it must pass BOTH
  `runGeneratorConformanceSuite` and `runEmbeddedLifecycleConformance` from
  `@packkit/core/testing` (see `src/conformance.test.ts`). **Zero core changes** —
  if something feels like it needs a core change, that's a design signal to discuss,
  not a patch to make.
- Go-specific manifest semantics (go.mod) live in `src/manifest-differ.ts`
  (`goModDiffer`), never in core.
- `src/characterization.test.ts` snapshots every preset's output byte-for-byte.
  Update intentionally with `vitest -u` and review the diff.
- Add or update tests for any behavior change; keep `strict` passing.
- Run `npx changeset` after a user-facing change.
- Do not commit `dist/` or `node_modules/`.
