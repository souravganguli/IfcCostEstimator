import { chromium } from 'playwright';

const assets = new URL('.', import.meta.url).pathname;
const images = [
  ['Containment hierarchy in Model Tree view', 'solibri-containment-hierarchy.png'],
  ['Component hierarchy in Model Tree view', 'solibri-component-hierarchy.png'],
  ['Layer hierarchy in Model Tree view', 'solibri-layer-hierarchy.png'],
  ['Federated floor hierarchy in Model Tree view', 'solibri-federated-floor-hierarchy.png'],
];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  await page.goto('https://help.solibri.com/hc/en-us/articles/1500003935741-Model-Hierarchies-in-the-Model-Tree-View', { waitUntil: 'domcontentloaded' });
  for (const [alt, filename] of images) {
    const image = page.locator(`article img[alt="${alt}"]`);
    await image.scrollIntoViewIfNeeded();
    await image.waitFor({ state: 'visible' });
    await image.screenshot({ path: `${assets}${filename}` });
  }
} finally {
  await browser.close();
}
