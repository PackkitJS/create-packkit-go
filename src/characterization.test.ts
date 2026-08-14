// Characterization safety net: a full snapshot of every file each preset generates,
// so any refactor that changes generated output fails loudly. Update with `-u`.
import { describe, it, expect } from 'vitest';
import { generate } from './generate.js';
import { PRESET_NAMES, PRESETS } from './presets.js';

const FIXED = { author: 'Fixture Author <fixture@example.com>', description: 'A fixture project.' };

describe('characterization: preset output is byte-stable', () => {
	for (const preset of PRESET_NAMES) {
		it(`${preset} matches its snapshot`, () => {
			const input = { ...(PRESETS[preset] ?? {}), name: 'fixture', ...FIXED };
			const { files } = generate(input, { preset });
			const sorted = Object.fromEntries(
				Object.keys(files)
					.sort()
					.map((path) => [path, files[path]]),
			);
			expect(sorted).toMatchSnapshot();
		});
	}

	it('generation is deterministic', () => {
		expect(generate({ ...(PRESETS['go-lib'] ?? {}), name: 'x' }).files).toEqual(
			generate({ ...(PRESETS['go-lib'] ?? {}), name: 'x' }).files,
		);
	});
});
