import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  test: {
    projects: [
      { test: { name: 'core', environment: 'node', include: ['tests/unit/**/*.test.ts'], exclude: ['tests/unit/features.test.ts', 'tests/unit/viewer.test.ts', 'tests/unit/display-controls.test.ts'] } },
      { test: { name: 'features', environment: 'happy-dom', setupFiles: ['tests/unit/fluent-setup.ts'], include: ['tests/unit/features.test.ts', 'tests/unit/viewer.test.ts', 'tests/unit/display-controls.test.ts'] } },
    ],
    coverage: { reportsDirectory: 'tests/coverage' },
  },
});