---
'create-packkit-go': minor
---

Bring Go to full generator-checklist parity with JavaScript/Python, realized the Go way
(@packkit/core `GENERATOR_CHECKLIST`). Every scaffold now also gets: a CI workflow
(`ci.yml`: gofmt → vet → build → test), Dependabot (gomod + github-actions), community
health files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue + PR templates), an agent
guide (AGENTS.md + CLAUDE.md with go commands), and a `.editorconfig` (tabs for `*.go`).
Adds **Apache-2.0** and **ISC** to the license choices (matching JS), and the CLI now
**git inits** the project with an initial commit (`--no-git` to skip). Verified across all
four presets with real `gofmt`/`go vet`/`go build`/`go test`. Go is a first-class citizen.
