import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const preview = process.env.TEST_SERVER === 'preview';
const port = preview ? 4174 : 5174;
const launchOptions = { args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
const basePath = process.env.VITE_BASE_PATH ?? '/IfcCostEstimator/';

export default defineConfig({
  testDir: './e2e',
  outputDir: './results',
  reporter: [
    ['list'],
    ['html', { outputFolder: fileURLToPath(new URL('./reports', import.meta.url)), open: 'never' }],
  ],
  fullyParallel: false,
  projects: [
    { name: 'chrome', use: { channel: 'chrome', launchOptions } },
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    command: `npm run ${preview ? 'preview' : 'dev'} -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false,
  },
});