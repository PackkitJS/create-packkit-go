---
'create-packkit-go': minor
---

Add the `go-worker` preset — a Go background worker. It emits a unit-testable `Handle`
seam, a runner that pulls messages from a source seam, processes each with bounded
retries + a poison-message hook, logs JSON lines on stdout, and **drains in-flight work
on SIGTERM/SIGINT before exiting 0** (a context-cancelled select over a channel-fed
reader — no blocking read that would hang a shutdown), plus a `cmd/<name>/main.go` entry
and a distroless multi-stage `Dockerfile` (no EXPOSE, `STOPSIGNAL SIGTERM`). It emits the
same provider-neutral `WorkerDeploymentContract` the JS and Python workers do — the
cross-language proof that `@packkit/core` models the archetype, not a language. The
generated worker's own test proves the SIGTERM drain exits 0, and CI runs it.
