import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'eslint.config.mjs',
      '**/dist',
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
    env: {
      jest: true,
    }
  },
];
