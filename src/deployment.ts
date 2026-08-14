import type { DeploymentContract } from '@packkit/core';
import type { GoConfig } from './types.js';
import { packageName } from './naming.js';

// A provider decides support from the contract, never the language. A Go library is
// non-deployable (imported, not run); a CLI is a distributable binary; a worker is the
// provider-neutral WorkerDeploymentContract (a long-running non-HTTP process — liveness
// is the process, not a port). The same `WorkerDeploymentContract` the JS and Python
// workers emit — the point of the cross-language proof.
export function deriveDeploymentContract(config: GoConfig): DeploymentContract {
	if (config.target === 'cli') return { type: 'cli', buildCommand: 'go build ./...' };
	if (config.target === 'worker') {
		const pkg = packageName(config.name);
		return {
			type: 'worker',
			runtime: `go-${config.goVersion}`,
			buildCommand: `go build -o ${pkg} ./cmd/${pkg}`,
			startCommand: `./${pkg}`,
			shutdown: { signals: ['SIGTERM', 'SIGINT'], drainsInflight: true },
			health: { type: 'process' },
			containerFile: 'Dockerfile',
			requiredEnvironmentVariables: [],
			optionalEnvironmentVariables: ['WORKER_MAX_ATTEMPTS', 'WORKER_LOG_LEVEL'],
		};
	}
	return { type: 'library', buildCommand: 'go build ./...' };
}
