import type { DeploymentContract } from '@packkit/core';
import type { GoConfig } from './types.js';

// A provider decides support from the contract, never the language. A Go library is
// non-deployable (imported, not run); a CLI is a distributable binary. Both build with
// `go build ./...`. Long-running Go shapes (an HTTP service, a worker) emit their own
// contracts in later versions.
export function deriveDeploymentContract(config: GoConfig): DeploymentContract {
	if (config.target === 'cli') return { type: 'cli', buildCommand: 'go build ./...' };
	return { type: 'library', buildCommand: 'go build ./...' };
}
