import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{ ignores: ['dist', 'coverage'] },
	// `_`-prefixed args are intentionally unused — kept to document a stable signature
	// (e.g. deriveDeploymentContract(config) before more targets branch on it).
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	// Plain-JS Node scripts (build/integration tooling) run under Node, not the
	// browser — give them Node globals so `process`/`console` aren't no-undef.
	{ files: ['**/*.mjs', 'scripts/**/*.js'], languageOptions: { globals: globals.node } },
);
