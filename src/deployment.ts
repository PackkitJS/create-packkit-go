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
	if (config.target === 'service') {
		const pkg = packageName(config.name);
		// The language-neutral `service` contract (core 0.4.0): a long-running HTTP
		// process whose liveness is a port + health path. `runtime` names the language
		// exactly like the JS ('node') and Python ('python-3.12') services do.
		return {
			type: 'service',
			runtime: `go-${config.goVersion}`,
			buildCommand: `go build -o ${pkg} ./cmd/${pkg}`,
			startCommand: `./${pkg}`,
			defaultPort: 8080,
			portEnvironmentVariable: 'PORT',
			healthCheckPath: '/healthz',
			containerFile: 'Dockerfile',
			requiredEnvironmentVariables: [],
			optionalEnvironmentVariables: ['PORT'],
		};
	}
	return { type: 'library', buildCommand: 'go build ./...' };
}
