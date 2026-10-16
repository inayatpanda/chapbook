// Exercise first-use legal reading with no backend, network or consent record.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let path = resolve(root, '.' + new URL(req.url, 'http://local').pathname);
    if (!path.startsWith(root + sep)) throw Error('outside root');
    if ((await stat(path)).isDirectory()) path += '/index.html';
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}/app/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await context.setOffline(true);
    for (const kind of ['terms', 'acceptable', 'privacy', 'ai', 'storage']) {
      const link = page.locator(`#legalConsentGate a[href="/${kind}"]`);
      await link.click();
      await page.locator('#legalSheet.open').waitFor({ state: 'visible' });
      assert.ok((await page.locator('#legalBody').innerText()).length > 180);
      assert.equal(await page.locator('#legalConsentGate').evaluate(el => el.inert), true);
      assert.equal(await page.locator('#legalCloseBtn').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#legalSheet')), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#legalCloseBtn').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#legalSheet').getAttribute('aria-hidden'), 'true');
      assert.equal(await link.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator('#lcTerms').isChecked(), false);
      assert.equal(await page.locator('#lcNotices').isChecked(), false);
      assert.equal(await page.locator('#lcAccept').isEnabled(), false);
      assert.equal(page.url(), url); assert.equal(context.pages().length, 1);
      console.log(`PASS ${width}px ${kind}: offline reading, keyboard focus and unchanged consent`);
    }
    await context.close();
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }
