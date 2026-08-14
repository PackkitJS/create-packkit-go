---
'create-packkit-go': patch
---

Update the emitted `packkit.json` `$schema` URL to the renamed org's Pages subdomain
(`packkitjs.github.io` → `packkitlabs.github.io`) following the `PackkitJS` → `PackkitLabs`
rename, so newly scaffolded projects reference the live schema location. Cosmetic — the
`$schema` is an editor-validation hint; no runtime behavior changes.
