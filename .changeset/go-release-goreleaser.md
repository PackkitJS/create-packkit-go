---
'create-packkit-go': minor
---

Add a `--release` option (`none` | `goreleaser`, default `none`). `--release goreleaser`
scaffolds a `.goreleaser.yaml` + a tag-triggered `.github/workflows/release.yml` that runs
[GoReleaser](https://goreleaser.com) on a version tag: for a binary target (cli/worker/service)
it cross-compiles binaries (linux/darwin/windows × amd64/arm64), packages archives + checksums,
and cuts a GitHub Release with a generated changelog; for a library it releases in GoReleaser's
library mode (skip the build — a library ships no binary — but still generate a changelog +
GitHub Release, consumers `go get module@vX.Y.Z`). This is the Go-idiomatic equivalent of the JS
generator's Changesets release feature (Changesets is npm-specific). The emitted config for all
four targets is validated with the real `goreleaser check` in integration; also surfaced in the
generator schema so the web/MCP configurators offer it. Default `none`, so existing scaffolds are
byte-identical.
