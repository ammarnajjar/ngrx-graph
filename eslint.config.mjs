import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'eslint.config.mjs',
      '**/docs/examples',
      '**/dist',
      '**/tmp',
      '**/test/fixtures/**',
      '**/assets',
      '**/node_modules',
      '**/.eslintcache',
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['tests/**/*'],
    languageOptions: { globals: globals.jest }
  },
];
