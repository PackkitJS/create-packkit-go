---
'create-packkit-go': minor
---

Add the `go-cli` preset — a Go command target. It keeps the testable library package
at the module root and adds a thin `cmd/<name>/main.go` that parses a `--name` flag (or
a positional arg) and delegates to the package, so all behavior stays unit-tested and
`main` stays minimal (idiomatic Go). Emits a `cli` deployment contract. The generated
command is gofmt-clean and passes `go vet`/`go build`/`go test`, and CI runs the built
binary end-to-end.
