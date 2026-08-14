import type { DeploymentContract, Diagnostic, GeneratedProjectMetadata } from '@packkit/core';

export type GoTarget = 'library' | 'cli';

export interface GoConfigInput {
	name?: string;
	description?: string;
	author?: string;
	license?: string;
	goVersion?: string;
	target?: GoTarget;
	/** The go.mod module path. Defaults to the sanitized name. */
	module?: string;
}

export interface GoConfig {
	name: string;
	description: string;
	author: string;
	license: string;
	goVersion: string;
	target: GoTarget;
	module: string;
}

export interface GeneratedGoProject {
	config: GoConfig;
	files: Record<string, string>;
	diagnostics: Diagnostic[];
	metadata: GeneratedProjectMetadata & { schemaVersion: number };
	deploymentContract: DeploymentContract;
	summary: { modulePath: string; packageName: string; target: GoTarget; fileCount: number };
}
