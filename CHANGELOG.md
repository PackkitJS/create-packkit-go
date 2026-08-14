# create-packkit-go

## 0.3.2

### Patch Changes

- 4dfa8d1: Update the emitted `packkit.json` `$schema` URL to the renamed org's Pages subdomain
  (`packkitjs.github.io` → `packkitlabs.github.io`) following the `PackkitJS` → `PackkitLabs`
  rename, so newly scaffolded projects reference the live schema location. Cosmetic — the
  `$schema` is an editor-validation hint; no runtime behavior changes.

## 0.3.1

### Patch Changes

- dbd7717: Fix `getSchema`'s `target` option to advertise all four targets (`library`, `cli`,
  `worker`, `service`) instead of only `library` — a stale value from the initial
  library-only release. A schema consumer (the web configurator, an MCP host) can now
  offer every target the generator actually builds.

## 0.3.0

### Minor Changes

- 3c5bf85: Add the `go-service` preset — a Go HTTP service on `net/http`. It ships a testable
  `NewHandler` router seam (serving `/` and a `/healthz` liveness probe), a `Run` server
  that binds `$PORT` (default 8080), logs JSON lines on stdout, and **gracefully drains
  in-flight requests on SIGTERM/SIGINT** via `http.Server.Shutdown`, a `cmd/<name>/main.go`
  entry, and a distroless multi-stage `Dockerfile` (EXPOSE 8080, `STOPSIGNAL SIGTERM`). It
  emits the new language-neutral `service` deployment contract from `@packkit/core@0.4.0`
  (`runtime: "go-1.x"`) — the same contract shape a Node or Python HTTP service uses, which
  is the whole point: the Go spike surfaced the one core generalization (`node-service` →
  `service`) the platform anticipated. Generated projects are gofmt-clean and pass
  `go vet`/`go build`/`go test` (including an `httptest` handler test and a real-server
  boot + `/healthz` + graceful-shutdown test); CI runs all four presets.

  Requires `@packkit/core@^0.4.0`.

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
