import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { deploymentSettingsKey } from '../../src/core/settings';

const settingsKey = deploymentSettingsKey(process.env.VITE_BASE_PATH ?? '/IfcCostEstimator/');
const source = readFileSync(new URL('../fixtures/box.ifc', import.meta.url), 'utf8');
const modelFile = (offset = 0) => ({
  name: 'same.ifc',
  mimeType: 'application/octet-stream',
  buffer: Buffer.from(source.replace('#19=IFCCARTESIANPOINT((0.,0.,0.));', `#19=IFCCARTESIANPOINT((${offset}.,0.,0.));`)),
});

function pixelDifference(first: Buffer, second: Buffer): number {
  const left = PNG.sync.read(first);
  const right = PNG.sync.read(second);
  expect([left.width, left.height]).toEqual([right.width, right.height]);
  let changed = 0;
  for (let index = 0; index < left.data.length; index += 4) {
    if (Math.abs(left.data[index] - right.data[index]) + Math.abs(left.data[index + 1] - right.data[index + 1]) + Math.abs(left.data[index + 2] - right.data[index + 2]) > 25) changed++;
  }
  return changed;
}

test.setTimeout(60000);
test.use({ screenshot: 'off', trace: 'off', video: 'off' });

async function openSettings(page: Page): Promise<void> {
  const menu = page.locator('[data-ribbon-menu="settings"]');
  if ((await menu.getAttribute('open')) === null) await menu.locator('summary').click();
}

test('shell renders under the project subpath without startup errors or external requests', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const failed: string[] = [];
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  const external: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'IFC Viewer' })).toBeVisible();
  await expect(page.getByRole('region', { name: '3D viewer' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('navigation', { name: 'Application ribbon' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open IFC', exact: true })).toBeVisible();
  expect((await page.getByRole('button', { name: 'Open IFC', exact: true }).boundingBox())!.height).toBe(20);
  expect(await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Segoe UI');
  expect(await page.getByRole('button', { name: 'Open IFC', exact: true }).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(15, 108, 189)');
  await expect(page.getByRole('navigation', { name: 'Viewer tools' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Model browser and tools' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Collapse models panel' })).toHaveAttribute('aria-controls', 'tool-sidebar');
  const settingsMenu = page.locator('[data-ribbon-menu="settings"]');
  await settingsMenu.locator('summary').click();
  await expect(page.getByLabel('Grid', { exact: true })).toBeVisible();
  await expect(settingsMenu).toHaveAttribute('open', '');
  await settingsMenu.locator('summary').click();
  const viewMenu = page.locator('[data-ribbon-menu="view"]');
  await viewMenu.locator('summary').click();
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  const ribbonPropertyDock = page.getByRole('complementary', { name: 'Element properties' });
  await expect(ribbonPropertyDock).toBeVisible();
  await expect(viewMenu).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Close property pane' }).click();
  await expect(ribbonPropertyDock).toBeHidden();
  const toolResize = page.getByRole('separator', { name: 'Resize tool pane' });
  const toolWidth = Number(await toolResize.getAttribute('aria-valuenow'));
  await toolResize.focus();
  await page.keyboard.press('ArrowRight');
  await expect(toolResize).toHaveAttribute('aria-valuenow', String(toolWidth + 16));
  await page.getByRole('button', { name: 'Search and filter' }).click();
  await expect(page.getByRole('heading', { name: 'Search and filter' })).toBeVisible();
  await expect(page.getByLabel('Search loaded models')).toBeVisible();
  expect(await page.getByLabel('Search loaded models').evaluate((element) => getComputedStyle(element).minHeight)).toBe('32px');
  expect(await page.getByLabel('Search loaded models').evaluate((element) => getComputedStyle(element).borderRadius)).toBe('4px');
  await expect.poll(() => page.getByRole('button', { name: 'Search and filter' }).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(235, 243, 252)');
  await expect(page.getByRole('button', { name: 'Search and filter' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Cost estimate' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cost estimate' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Search and filter' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('heading', { name: 'Cost estimate' })).toBeVisible();
  await page.getByRole('button', { name: 'Close side pane' }).click();
  await expect(page.getByRole('complementary', { name: 'Model browser and tools' })).toBeHidden();
  await page.getByRole('button', { name: 'Search and filter' }).click();
  await expect(page.getByRole('heading', { name: 'Search and filter' })).toBeVisible();
  const propertyRail = page.getByRole('button', { name: 'Element properties' });
  await propertyRail.click();
  const propertyDock = page.getByRole('complementary', { name: 'Element properties' });
  await expect(propertyDock).toBeVisible();
  await expect(page.locator('#tool-sidebar #property-dock')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search and filter' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Select an element to inspect its properties.')).toBeVisible();
  const propertyResize = page.getByRole('separator', { name: 'Resize property pane' });
  const originalWidth = Number(await propertyResize.getAttribute('aria-valuenow'));
  await propertyResize.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(propertyResize).toHaveAttribute('aria-valuenow', String(originalWidth + 16));
  const keyboardWidth = Number(await propertyResize.getAttribute('aria-valuenow'));
  const resizeBounds = (await propertyResize.boundingBox())!;
  await page.mouse.move(resizeBounds.x + resizeBounds.width / 2, resizeBounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(resizeBounds.x + resizeBounds.width / 2 - 28, resizeBounds.y + 100, { steps: 4 });
  await page.mouse.up();
  await expect(propertyResize).toHaveAttribute('aria-valuenow', String(keyboardWidth + 28));
  for (let step = 0; step < 12; step++) await page.keyboard.press('Shift+ArrowRight');
  await expect(propertyResize).toHaveAttribute('aria-valuenow', '260');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(propertyResize).toHaveAttribute('aria-valuenow', '260');
  for (let step = 0; step < 8; step++) await page.keyboard.press('Shift+ArrowLeft');
  await expect(propertyResize).toHaveAttribute('aria-valuenow', '560');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(propertyResize).toHaveAttribute('aria-valuenow', '560');
  const openPropertyBounds = await propertyDock.boundingBox();
  const viewportBounds = await page.getByRole('region', { name: '3D viewer' }).boundingBox();
  expect(openPropertyBounds).not.toBeNull();
  expect(openPropertyBounds!.x).toBeGreaterThan(viewportBounds!.x + viewportBounds!.width - 1);
  expect(Math.abs(openPropertyBounds!.y - viewportBounds!.y)).toBeLessThan(1);
  expect(Math.abs(openPropertyBounds!.height - viewportBounds!.height)).toBeLessThan(1);
  expect(await page.getByRole('button', { name: 'Dock property pane left' }).count()).toBe(0);
  const toolSidebar = page.getByRole('complementary', { name: 'Model browser and tools' });
  const closePropertyButton = page.getByRole('button', { name: 'Close property pane' });
  const openViewportBounds = await page.getByRole('region', { name: '3D viewer' }).boundingBox();
  await closePropertyButton.click();
  await expect(propertyDock).toBeHidden();
  await expect(toolSidebar).toBeVisible();
  const closedPropertyViewportBounds = await page.getByRole('region', { name: '3D viewer' }).boundingBox();
  expect(closedPropertyViewportBounds!.width).toBeGreaterThan(openViewportBounds!.width);
  await propertyRail.click();
  await expect(propertyDock).toBeVisible();
  const reopenedPropertyBounds = await propertyDock.boundingBox();
  const reopenedViewportBounds = await page.getByRole('region', { name: '3D viewer' }).boundingBox();
  expect(reopenedPropertyBounds!.x).toBeGreaterThan(reopenedViewportBounds!.x + reopenedViewportBounds!.width - 1);
  await page.getByRole('button', { name: 'Close side pane' }).click();
  await expect(toolSidebar).toBeHidden();
  await expect(propertyDock).toBeVisible();
  await closePropertyButton.click();
  await expect(propertyDock).toBeHidden();
  await page.getByRole('button', { name: 'Search and filter' }).click();
  await expect(toolSidebar).toBeVisible();
  await expect(propertyRail).toHaveAttribute('aria-pressed', 'false');
  await expect(propertyRail).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('shell.png') });
});

test('real IFC geometry renders, moves, and isolates repeated-name models with recoverable failures', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  const uploads: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url());
    if (request.method() !== 'GET') uploads.push(request.url());
  });
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  await page.goto('./');
  await openSettings(page);
  await page.getByLabel('Grid', { exact: true }).uncheck();
  const canvas = page.locator('canvas');
  const emptyImage = await canvas.screenshot();
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
  const loadedImage = await canvas.screenshot();
  expect(pixelDifference(emptyImage, loadedImage)).toBeGreaterThan(500);
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 160, bounds.y + bounds.height / 2 + 70, { steps: 15 });
  await page.mouse.up();
  expect(pixelDifference(loadedImage, await canvas.screenshot())).toBeGreaterThan(200);
  await page.mouse.wheel(0, -250);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(bounds.x + bounds.width / 2 + 100, bounds.y + bounds.height / 2 + 40, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.getByRole('button', { name: 'Fit visible models' }).click();

  await page.getByLabel('Open IFC files').setInputFiles([
    { name: 'broken.ifc', mimeType: 'application/octet-stream', buffer: Buffer.from('not IFC') }, modelFile(8),
  ]);
  await expect(page.locator('[data-state=loaded]')).toHaveCount(2);
  await expect(page.locator('[data-state=failed]')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Invalid IFC');
  await page.getByRole('button', { name: 'Hide model 1', exact: true }).click();
  await expect(page.locator('[data-model-id="1"]')).toContainText('Hidden');
  await expect(page.locator('[data-model-id="3"]')).toContainText('Visible');
  await page.getByRole('button', { name: 'Fit visible models' }).click();
  await page.getByRole('button', { name: 'Show model 1', exact: true }).click();
  await page.screenshot({ path: test.info().outputPath('models-desktop.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole('button', { name: 'Open IFC', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fit visible models' }).click();
  await page.screenshot({ path: test.info().outputPath('models-min-desktop.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Remove model 1', exact: true }).click();
  await expect(page.locator('[data-model-id="3"]')).toContainText('Visible');
  await page.getByRole('button', { name: 'Remove model 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fit visible models' })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove model 2', exact: true }).click();
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(uploads).toEqual([]);
  expect(failed).toEqual([]);
  const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).toEqual({ local: { [settingsKey]: '{"version":1,"showGrid":false}' }, session: {} });
  await page.reload();
  await expect(page.locator('[data-state=loaded]')).toHaveCount(0);
  await openSettings(page);
  await expect(page.getByLabel('Grid', { exact: true })).not.toBeChecked();
});

test('storage denial does not prevent rendering and in-memory preferences', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage denied'); } });
  });
  await page.goto('./');
  await openSettings(page);
  await expect(page.getByLabel('Grid', { exact: true })).toBeChecked();
  await page.getByLabel('Grid', { exact: true }).uncheck();
  await expect(page.getByRole('status')).toHaveText('Settings kept for this session');
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
});

test('corrupt preferences use defaults and writes preserve unrelated keys', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem('unrelated', 'preserve');
    localStorage.setItem(key, '{invalid');
  }, settingsKey);
  await page.goto('./');
  await openSettings(page);
  await expect(page.getByLabel('Grid', { exact: true })).toBeChecked();
  await page.getByLabel('Grid', { exact: true }).uncheck();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('preserve');
});

test('graphics initialization failure produces a clear unavailable-viewer state', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('3D graphics are unavailable');
  await expect(page.getByRole('button', { name: 'Open IFC', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Viewer unavailable');
});

test('compact chrome and collapsible models panel preserve models and resize the canvas', async ({ page }) => {
  await page.goto('./');
  await openSettings(page);
  await page.getByLabel('Grid', { exact: true }).uncheck();
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    expect((await page.locator('header').boundingBox())!.height).toBe(22);
    expect((await page.locator('footer').boundingBox())!.height).toBe(24);
    const sidebar = page.getByRole('complementary', { name: 'Models' });
    const canvas = page.locator('canvas');
    const expandedWidth = (await canvas.boundingBox())!.width;
    const sidebarWidth = (await page.locator('#tool-sidebar').boundingBox())!.width;
    const collapse = page.getByRole('button', { name: 'Collapse models panel' });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.click();
    const expand = page.getByRole('button', { name: 'Expand models panel' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).toBeHidden();
    await expect(page.getByRole('button', { name: 'Hide model 1', exact: true })).toBeHidden();
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBeCloseTo(expandedWidth + sidebarWidth, 0);
    await expect.poll(async () => canvas.evaluate((element) => (element as HTMLCanvasElement).width / element.clientWidth)).toBeCloseTo(Math.min(await page.evaluate(() => devicePixelRatio), 2), 1);
    await page.getByRole('button', { name: 'Fit visible models' }).click();
    const image = PNG.sync.read(await canvas.screenshot());
    let nonBackground = 0;
    for (let index = 0; index < image.data.length; index += 4) {
      if (Math.abs(image.data[index] - 234) + Math.abs(image.data[index + 1] - 240) + Math.abs(image.data[index + 2] - 237) > 40) nonBackground++;
    }
    expect(nonBackground).toBeGreaterThan(500);
    await page.screenshot({ path: test.info().outputPath(`compact-collapsed-${viewport.width}.png`) });
    await expand.focus();
    await page.keyboard.press('Enter');
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collapse models panel' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
    await expect(page.locator('[data-model-id="1"]')).toContainText('Visible');
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBeCloseTo(expandedWidth, 0);
    await page.getByRole('button', { name: 'Fit visible models' }).click();
    await page.screenshot({ path: test.info().outputPath(`compact-expanded-${viewport.width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator('footer').boundingBox())!.y + 24).toBeCloseTo(viewport.height, 0);
  }
  await page.getByRole('button', { name: 'Collapse models panel' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Collapse models panel' })).toHaveAttribute('aria-expanded', 'true');
});

test.describe('Duplex IFC2x3 models', () => {
  const names = ['Ifc2x3_Duplex_Architecture.ifc', 'Ifc2x3_Duplex_MEP.ifc', 'Ifc2s3_Duplex_Electrical.ifc'];
  const paths = names.map((name) => fileURLToPath(new URL(`../fixtures/duplex/${name}`, import.meta.url)));
  test.skip(!paths.every((path) => existsSync(path)), 'Supplied Duplex fixtures are local-only; place all three files in tests/fixtures/duplex to run these checks.');

  for (const [index, name] of names.entries()) {
    test(`renders ${name} and releases it through model controls`, async ({ page }) => {
      test.setTimeout(180000);
      let pageErrors = 0;
      let unexpectedRequests = 0;
      page.on('pageerror', () => pageErrors++);
      page.on('request', (request) => {
        if (request.method() !== 'GET' || !request.url().startsWith('http://127.0.0.1:')) unexpectedRequests++;
      });
      await page.goto('./');
      await openSettings(page);
      await page.getByLabel('Grid', { exact: true }).uncheck();
      const canvas = page.locator('canvas');
      const empty = await canvas.screenshot();
      await page.getByLabel('Open IFC files').setInputFiles(paths[index]);
      await expect(page.locator('[data-state=loaded]')).toHaveCount(1, { timeout: 120000 });
      await expect(page.locator('[data-state=failed]')).toHaveCount(0);
      await expect(page.locator('[data-model-id="1"]')).toContainText('IFC2X3');
      expect(pixelDifference(empty, await canvas.screenshot())).toBeGreaterThan(500);
      await page.getByRole('button', { name: 'Hide model 1', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Fit visible models' })).toBeDisabled();
      await page.getByRole('button', { name: 'Show model 1', exact: true }).click();
      await page.getByRole('button', { name: 'Fit visible models' }).click();
      expect(pixelDifference(empty, await canvas.screenshot())).toBeGreaterThan(500);
      await page.getByRole('button', { name: 'Remove model 1', exact: true }).click();
      await expect(page.locator('[data-state=loaded]')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'No models loaded' })).toBeVisible();
      expect(pageErrors).toBe(0);
      expect(unexpectedRequests).toBe(0);
    });
  }

  test('federates all three local files and preserves models through collapse, removal, and reopening', async ({ page }) => {
    test.setTimeout(240000);
    let pageErrors = 0;
    let unexpectedRequests = 0;
    page.on('pageerror', () => pageErrors++);
    page.on('request', (request) => {
      if (request.method() !== 'GET' || !request.url().startsWith('http://127.0.0.1:')) unexpectedRequests++;
    });
    await page.goto('./');
    await openSettings(page);
    await page.getByLabel('Grid', { exact: true }).uncheck();
    const diagnostics = await page.context().newCDPSession(page);
    await diagnostics.send('Performance.enable');
    const heapBytes = async () => {
      const { metrics } = await diagnostics.send('Performance.getMetrics');
      return metrics.find((metric: { name: string; value: number }) => metric.name === 'JSHeapUsedSize')?.value ?? null;
    };
    await page.evaluate(() => {
      const measurement = { count: 0, maxMs: 0 };
      Object.assign(window, { localTestLongTasks: measurement });
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          measurement.count++;
          measurement.maxMs = Math.max(measurement.maxMs, entry.duration);
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    });
    const baselineHeap = await heapBytes();
    const empty = await page.locator('canvas').screenshot();
    const loadStart = Date.now();
    await page.getByLabel('Open IFC files').setInputFiles(paths);
    await expect(page.locator('[data-state=loaded]')).toHaveCount(3, { timeout: 180000 });
    const combinedLoadMs = Date.now() - loadStart;
    const loadedHeap = await heapBytes();
    await expect(page.locator('[data-state=failed]')).toHaveCount(0);
    expect(pixelDifference(empty, await page.locator('canvas').screenshot())).toBeGreaterThan(500);
    await page.getByRole('button', { name: 'Collapse models panel' }).click();
    await expect(page.getByRole('complementary', { name: 'Models' })).toBeHidden();
    await page.getByRole('button', { name: 'Expand models panel' }).click();
    await expect(page.locator('[data-state=loaded]')).toHaveCount(3);
    await page.getByRole('button', { name: 'Hide model 1', exact: true }).click();
    await expect(page.locator('[data-model-id="2"]')).toContainText('Visible');
    await expect(page.locator('[data-model-id="3"]')).toContainText('Visible');
    const fitStart = Date.now();
    await page.getByRole('button', { name: 'Fit visible models' }).click();
    const fitInteractionMs = Date.now() - fitStart;
    await page.getByRole('button', { name: 'Remove model 2', exact: true }).click();
    await expect(page.locator('[data-state=loaded]')).toHaveCount(2);
    await page.getByLabel('Open IFC files').setInputFiles(paths[1]);
    await expect(page.locator('[data-state=loaded]')).toHaveCount(3, { timeout: 120000 });
    await expect(page.locator('[data-model-id="4"]')).toContainText('IFC2X3');
    const keys = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(keys).toEqual({ local: ['ifccostestimator:settings:v1'], session: [] });
    expect(pageErrors).toBe(0);
    expect(unexpectedRequests).toBe(0);
    for (const id of [1, 3, 4]) {
      await page.getByRole('button', { name: `Remove model ${id}`, exact: true }).click();
    }
    await expect(page.locator('[data-state=loaded]')).toHaveCount(0);
    await diagnostics.send('HeapProfiler.collectGarbage');
    const removedHeap = await heapBytes();
    const longTasks = await page.evaluate(() => (window as unknown as { localTestLongTasks: { count: number; maxMs: number } }).localTestLongTasks);
    const measurement = {
      server: process.env.TEST_SERVER === 'preview' ? 'production-preview' : 'development',
      browser: test.info().project.name,
      combinedLoadMs, fitInteractionMs,
      jsHeapBytes: { baseline: baselineHeap, loaded: loadedHeap, removedAfterGc: removedHeap },
      longTasks,
      note: 'One local run of the supplied three-model workload; JS heap is not total browser, WASM, or GPU memory. Fit duration includes test-driver overhead.',
    };
    await test.info().attach('local-resource-measurement', { body: JSON.stringify(measurement, null, 2), contentType: 'application/json' });
    console.log(JSON.stringify(measurement));
    await diagnostics.detach();
    await page.reload();
    await expect(page.locator('[data-state=loaded]')).toHaveCount(0);
  });
});

test('graphics context loss clears the session, stops the renderer, and requires a fresh reload', async ({ page }) => {
  await page.goto('./');
  await openSettings(page);
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
  await page.locator('canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByRole('status')).toHaveText('Viewer unavailable');
  await expect(page.getByRole('alert')).toContainText('Graphics context lost');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-state=loaded]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open IFC', exact: true })).toBeDisabled();
  await openSettings(page);
  await page.getByLabel('Grid', { exact: true }).uncheck();
  await expect(page.getByRole('status')).toHaveText('Viewer unavailable');
  await page.reload();
  await page.getByLabel('Open IFC files').setInputFiles(modelFile());
  await expect(page.locator('[data-state=loaded]')).toHaveCount(1);
});