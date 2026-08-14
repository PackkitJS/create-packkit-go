---
'create-packkit-go': patch
---

Fix `getSchema`'s `target` option to advertise all four targets (`library`, `cli`,
`worker`, `service`) instead of only `library` — a stale value from the initial
library-only release. A schema consumer (the web configurator, an MCP host) can now
offer every target the generator actually builds.
