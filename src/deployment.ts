import type { DeploymentContract } from '@packkit/core';
import type { GoConfig } from './types.js';

// A provider decides support from the contract, never the language. A Go library is
// non-deployable (imported, not run); the build is `go build ./...`. Deployable Go
// shapes (a CLI, an HTTP service, a worker) emit their own contracts in later versions.
export function deriveDeploymentContract(_config: GoConfig): DeploymentContract {
	return { type: 'library', buildCommand: 'go build ./...' };
}
