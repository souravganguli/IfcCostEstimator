import { chromium } from 'playwright';

const assets = new URL('.', import.meta.url).pathname;
const pages = [
  {
    url: 'https://help.solibri.com/hc/en-us/articles/12771718136343-Filtering-Components',
    images: [
      ['filtering_view_general.jpg', 'solibri-filtering-view.png'],
      ['filtering_AND_filter.png', 'solibri-include-and.png'],
      ['filtering_OR_filter.png', 'solibri-include-or.png'],
      ['filtering_components_filter.png', 'solibri-default-components-filter.png'],
    ],
  },
  {
    url: 'https://help.solibri.com/hc/en-us/articles/12771718174103-Adding-a-New-Filter',
    images: [
      ['filtering_property.jpg', 'solibri-property-field.png'],
      ['filtering_propertyset2.jpg', 'solibri-property-set-format.png'],
      ['filtering_operator.jpg', 'solibri-operator-selection.png'],
      ['filtering_values.jpg', 'solibri-value-selection.png'],
    ],
  },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  for (const group of pages) {
    await page.goto(group.url, { waitUntil: 'domcontentloaded' });
    for (const [alt, filename] of group.images) {
      const image = page.locator(`article img[alt="${alt}"]`);
      await image.scrollIntoViewIfNeeded();
      await image.waitFor({ state: 'visible' });
      await image.screenshot({ path: `${assets}${filename}` });
    }
  }
} finally {
  await browser.close();
}
