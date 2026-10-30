// ESLint flat config (ESLint 9+). TypeScript-aware linting for src, tests, and
// root config files. Stylistic/formatting concerns are owned by Prettier; this
// config disables rules that would conflict (eslint-config-prettier) and keeps
// only correctness and maintainability rules. See docs/architecture ADRs for
// the rationale behind the quality-guardrail tooling.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Never lint build output, dependencies, or generated test artifacts.
    ignores: ['dist/**', 'node_modules/**', 'tests/results/**', 'tests/reports/**', 'tests/coverage/**', 'tests/artifacts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    // The flat config file and any plain JS are not part of the TS program;
    // disable type-aware linting for them to avoid parser-service errors.
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Type-aware rules only apply to TypeScript sources; the flat config file
    // and other JS are linted without type information.
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Encourage explicit handling over silent `any` propagation, but do not
      // block work: these are warnings so the floor can be tightened over time.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Allow intentional void-returning handlers passed to DOM APIs.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
  {
    // Test files legitimately use permissive typing for fixtures and mocks, and
    // vitest spies trip type-aware rules that add no real safety here. Turn off
    // the high-noise, low-signal rules for tests while keeping correctness
    // checks (e.g. no-floating-promises) active everywhere.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  // Keep last: turn off every rule that conflicts with Prettier formatting.
  prettier,
);
