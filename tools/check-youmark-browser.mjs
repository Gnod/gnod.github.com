import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional browser check. No site dependencies, browser downloads, or publication.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.YOUMARK_SCREENSHOTS;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    let file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + sep)) throw new Error('Outside root');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  if (output) await mkdir(output, { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) errors.push(`External request: ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  let count = 0;
  for (const route of ['', 'support/', 'privacy/']) {
    for (const lang of ['en', 'zh']) {
      for (const scheme of ['light', 'dark']) {
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
          await page.emulateMedia({ colorScheme: scheme });
          const response = await page.goto(`${origin}/youmark/${route}?lang=${lang}`);
          assert.equal(response.status(), 200);
          await page.locator(`[data-locale="${lang}"][aria-current="true"]`).waitFor();
          const state = await page.evaluate(() => {
            const article = document.querySelector('article:not([hidden])');
            return {
              lang: document.documentElement.lang,
              count: document.querySelectorAll('article:not([hidden])').length,
              headings: article.querySelectorAll('h1').length,
              title: document.title,
              expectedTitle: article.dataset.title,
              description: document.querySelector('meta[name="description"]').content,
              expectedDescription: article.dataset.description,
              overflow: document.documentElement.scrollWidth > innerWidth,
              links: [...document.querySelectorAll('[data-local]')].map((link) => new URL(link.href).searchParams.get('lang')),
              imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
              background: getComputedStyle(document.documentElement).backgroundColor,
            };
          });
          assert.equal(state.lang, lang === 'zh' ? 'zh-CN' : 'en');
          assert.equal(state.count, 1);
          assert.equal(state.headings, 1);
          assert.equal(state.title, state.expectedTitle);
          assert.equal(state.description, state.expectedDescription);
          assert.equal(state.overflow, false, `Overflow: ${route} ${lang} ${scheme} ${width}`);
          assert(state.links.every((value) => value === lang));
          assert(state.imagesLoaded);
          assert.equal(state.background, scheme === 'dark' ? 'rgb(22, 24, 25)' : 'rgb(250, 250, 250)');
          if (output && ((width === 390 && lang === 'zh') || (width === 1440 && lang === 'en'))) {
            const filename = `${route.replace('/', '') || 'index'}-${lang}-${scheme}-${width}.png`;
            await page.screenshot({ path: resolve(output, filename), fullPage: true });
          }
          count += 1;
        }
      }
    }
  }
  await page.goto(`${origin}/youmark/support/?lang=zh`);
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await page.locator('[data-locale="en"][aria-current="true"]').waitFor();
  await page.locator('header a[href^="/youmark/privacy/"]').click();
  assert.equal(new URL(page.url()).searchParams.get('lang'), 'en');
  await page.goto(`${origin}/youmark/support/?lang=invalid`);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('href'), '#main');
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#main');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noScript.newPage();
  await fallback.goto(`${origin}/youmark/privacy/`);
  assert.equal(await fallback.locator('article:visible').count(), 1);
  assert.equal(await fallback.locator('article:visible').getAttribute('lang'), 'en');
  assert.equal(await fallback.locator('h1:visible').textContent(), 'Privacy policy');
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log(`YouMark browser checks passed: ${count} page/language/theme/viewport combinations, language navigation, keyboard access, and no-JS fallback.`);
  if (output) console.log(`Review screenshots: ${output}`);
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
