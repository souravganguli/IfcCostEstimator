import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  test: {
    projects: [
      { test: { name: 'core', environment: 'node', include: ['tests/unit/**/*.test.ts'], exclude: ['tests/unit/features.test.ts', 'tests/unit/viewer.test.ts'] } },
      { test: { name: 'features', environment: 'happy-dom', include: ['tests/unit/features.test.ts', 'tests/unit/viewer.test.ts'] } },
    ],
    coverage: { reportsDirectory: 'tests/coverage' },
  },
});