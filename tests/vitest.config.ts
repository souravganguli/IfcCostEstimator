import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          exclude: [
            'tests/unit/features.test.ts',
            'tests/unit/viewer.test.ts',
            'tests/unit/display-controls.test.ts',
            'tests/unit/viewer-viewpoints.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'features',
          environment: 'happy-dom',
          setupFiles: ['tests/unit/fluent-setup.ts'],
          include: [
            'tests/unit/features.test.ts',
            'tests/unit/viewer.test.ts',
            'tests/unit/display-controls.test.ts',
            'tests/unit/viewer-viewpoints.test.ts',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'tests/coverage',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      // Exclude the pure composition shell and the Web Worker entry point: both
      // are exercised only in the browser (e2e), not by Node/happy-dom units.
      exclude: ['src/main.ts', 'src/adapters/ifc/worker.ts'],
      // Floor set just below current measured coverage so the gate can only be
      // ratcheted upward as tests are added. See docs/adr for the rationale.
      thresholds: {
        statements: 45,
        branches: 42,
        functions: 43,
        lines: 47,
      },
    },
  },
});
