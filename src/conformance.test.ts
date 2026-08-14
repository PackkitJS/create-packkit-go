// create-packkit-go dogfoods @packkit/core's conformance suites: proof it's a valid
// platform generator (generation) AND that a host can drive its full lifecycle
// (digest, definition replay, host extension, baseline upgrade) identically to any
// other generator — the SAME suites create-packkit and create-packkit-py pass, with
// ZERO core changes. That is the Go spike's whole point.
import { describe, it } from 'vitest';
import {
	runGeneratorConformanceSuite,
	runEmbeddedLifecycleConformance,
} from '@packkit/core/testing';
import { goGenerator } from './generator.js';

describe('create-packkit-go conforms to the @packkit/core generator contract', () => {
	runGeneratorConformanceSuite(goGenerator, (name, fn) => it(name, fn));
});

describe('create-packkit-go passes the embedded lifecycle conformance suite', () => {
	runEmbeddedLifecycleConformance(goGenerator, (name, fn) => it(name, fn));
});
