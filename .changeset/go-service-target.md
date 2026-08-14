---
'create-packkit-go': minor
---

Add the `go-service` preset — a Go HTTP service on `net/http`. It ships a testable
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
