# create-packkit-go 🐹📦

> Scaffold a modern **Go** project — a `go.mod` module, idiomatic layout, table-style tests — from a CLI (and soon the browser). [Packkit](https://github.com/PackkitJS/create-packkit)'s Go sibling.

[![npm](https://img.shields.io/npm/v/create-packkit-go.svg)](https://www.npmjs.com/package/create-packkit-go) [![CI](https://github.com/PackkitJS/create-packkit-go/actions/workflows/ci.yml/badge.svg)](https://github.com/PackkitJS/create-packkit-go/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Like `create-packkit` and `create-packkit-py`, this is a **JavaScript generator** —
but its _output_ is an idiomatic Go project. The whole Packkit engine pattern (a
deterministic core, presets, a browser configurator, `--schema`, MCP, and a
`packkit.json` provenance file) carries over, while you get standard Go: a `go.mod`
module, a package with a doc comment, and `go test`-ready table tests. No Go
toolchain is needed to _generate_ — only to run what's generated.

## Quick start

```sh
npx create-packkit-go go-lib my-lib
# then:
cd my-lib && go test ./... && go build ./...
```

Every generated project is **`gofmt`-clean and passes `go vet`, `go build`, and
`go test` out of the box** — the same guarantee `create-packkit` makes for JS/TS.

## Presets

| Preset       | Alias            | What you get                                                                                                                                                                    |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `go-lib`     | `lib`            | Library — `go.mod` module, a documented package with an exported function, a table test, README, `.gitignore`.                                                                  |
| `go-cli`     | `cli`            | Command — everything in `go-lib` plus a `cmd/<name>/main.go` that wires the package to flags (logic stays testable in the package).                                             |
| `go-worker`  | `worker`         | Background worker — a testable `Handle` seam, a runner that drains on `SIGTERM` and exits 0, JSON logs, retries + poison hook, distroless `Dockerfile`.                         |
| `go-service` | `service`, `svc` | HTTP service — `net/http` server on `$PORT`, `/` + `/healthz`, JSON logs, graceful shutdown, an `httptest` handler test + a live-server shutdown test, distroless `Dockerfile`. |

Each target emits its own provider-neutral deployment contract, exactly as the JS and
Python generators do — `go-service` emits the language-neutral `service` contract
(`runtime: "go-1.x"`), the same contract shape a Node or Python HTTP service uses.

## Options

```
--name <name>            Project name (or a positional, in either slot)
--module <path>          go.mod module path (default: sanitized name)
--description <text>
--author "<name> <email>"
--license <MIT|none>     (default: MIT)
--go <1.x>               Minimum Go version (default: 1.23)
--here                   Scaffold into the current directory
--force                  Overwrite existing files
```

## Where it fits

`create-packkit-go` is a **separate package**, not a fork of `create-packkit`'s
core. It implements the shared [`@packkit/core`](https://www.npmjs.com/package/@packkit/core)
`PackkitGenerator` contract — the same interface the JS and Python generators
implement — with **zero core changes**. Go-specific concerns (the `go.mod` manifest
diff that powers baseline-aware `upgrade`) stay in this package; the core stays
language-neutral. The shared `packkit-mcp` server can front all three generators,
and the browser configurator can host all three engines.

## Requirements

Node.js >= 20 to run the generator. Go (any recent version, `go.mod` floor 1.23) to
build and test what it produces.

## License

MIT © DanMat
