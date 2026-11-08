import { chromium } from 'playwright';

const assets = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1365, height: 768 } });

try {
  const help = await context.newPage();
  await help.goto('https://help.solibri.com/hc/en-us/articles/1500006907602-Searching-Components-in-Solibri', { waitUntil: 'domcontentloaded' });
  const helpImages = [
    ['search.jpg', 'solibri-search-field.png'],
    ['info_view_identification_tab.jpg', 'solibri-identification-fields.png'],
    ['search_result_example_window.png', 'solibri-search-results.png'],
  ];
  for (const [alt, filename] of helpImages) {
    const image = help.locator(`article img[alt="${alt}"]`);
    await image.waitFor({ state: 'visible' });
    await image.screenshot({ path: `${assets}${filename}` });
  }
} finally {
  await browser.close();
}
