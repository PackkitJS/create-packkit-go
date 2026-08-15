---
'create-packkit-go': patch
---

Bump the generated worker/service `Dockerfile` distroless base from
`gcr.io/distroless/static-debian12` to `static-debian13` (Debian 13 "trixie" is the
current distroless generation). Also add a `check:freshness` script + weekly workflow
that tracks the emitted Go toolchain floor and distroless base against upstream — the
freshness net that caught this.
