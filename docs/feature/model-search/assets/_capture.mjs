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

  const videoPage = await context.newPage();
  await videoPage.goto('https://www.youtube.com/watch?v=_me6LNVbqhI', { waitUntil: 'domcontentloaded' });
  const video = videoPage.locator('video').first();
  await video.waitFor({ state: 'attached' });
  await video.evaluate((element) => { element.muted = true; });
  const frames = [45, 120, 240, 360];
  for (const second of frames) {
    await video.evaluate((element, time) => {
      element.pause();
      element.currentTime = time;
    }, second);
    await videoPage.waitForFunction((time) => {
      const current = document.querySelector('video');
      return current && Math.abs(current.currentTime - time) < 1;
    }, second);
    const minutes = String(Math.floor(second / 60)).padStart(2, '0');
    const seconds = String(second % 60).padStart(2, '0');
    await video.screenshot({ path: `${assets}solibri-video-${minutes}m${seconds}s.png` });
  }
} finally {
  await browser.close();
}