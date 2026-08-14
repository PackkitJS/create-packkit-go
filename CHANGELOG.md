# create-packkit-go

## 0.2.0

### Minor Changes

- 2938aef: Add the `go-cli` preset — a Go command target. It keeps the testable library package
  at the module root and adds a thin `cmd/<name>/main.go` that parses a `--name` flag (or
  a positional arg) and delegates to the package, so all behavior stays unit-tested and
  `main` stays minimal (idiomatic Go). Emits a `cli` deployment contract. The generated
  command is gofmt-clean and passes `go vet`/`go build`/`go test`, and CI runs the built
  binary end-to-end.
- 79b59f7: Add the `go-worker` preset — a Go background worker. It emits a unit-testable `Handle`
  seam, a runner that pulls messages from a source seam, processes each with bounded
  retries + a poison-message hook, logs JSON lines on stdout, and **drains in-flight work
  on SIGTERM/SIGINT before exiting 0** (a context-cancelled select over a channel-fed
  reader — no blocking read that would hang a shutdown), plus a `cmd/<name>/main.go` entry
  and a distroless multi-stage `Dockerfile` (no EXPOSE, `STOPSIGNAL SIGTERM`). It emits the
  same provider-neutral `WorkerDeploymentContract` the JS and Python workers do — the
  cross-language proof that `@packkit/core` models the archetype, not a language. The
  generated worker's own test proves the SIGTERM drain exits 0, and CI runs it.
