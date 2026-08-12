// Responsive Interactive Studio E2E. Run against a test-keyed build:
//   npm run build:test && node e2e/interactive-studio.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { mintTestLicence } from '../test/fixtures/testLicence.mjs';

if (!existsSync('dist/TEST-BUILD')) {
  console.error('Interactive Studio E2E needs `npm run build:test` first.');
  process.exit(2);
}

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(req.url.split('?')[0]);
    if (path.endsWith('/')) path += 'index.html';
    const body = await readFile(join('dist', normalize(path).replace(/^(\.\.[/\\])+/, '')));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(resolve => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width:1440, height:900 } });
await context.route('https://api.github.com/user', route => route.fulfill({ status:200, contentType:'application/json', body:'{"login":"e2e"}' }));
await context.addInitScript(({ licence }) => {
  localStorage.setItem('helm.studio.licence', licence);
  localStorage.setItem('chapbook.legalConsent.v1', JSON.stringify({ version:'2026-08-08', termsAccepted:true, noticesAcknowledged:true, ageConfirmed:true, acceptedAt:new Date().toISOString() }));
  localStorage.setItem('helm.studio.config.v1', JSON.stringify({ ghOwner:'e2e', ghRepo:'chapbook-test', ghBranch:'main', ghToken:'test-token' }));
  localStorage.setItem('helm.studio.gettingStarted.dismissed', '1');
  localStorage.setItem('helm.studio.onboarded', '1');
}, { licence: mintTestLicence() });

const page = await context.newPage();
const checks = [];
const check = (name, ok, detail='') => {
  checks.push({ name, ok });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function openPalette() {
  await page.goto(`${base}/app/?e2e=interactive-studio`, { waitUntil:'load' });
  await page.locator('#app').waitFor({ state:'visible' });
  await page.getByRole('button', { name:/Make an interactive Build/ }).click();
  await page.getByRole('button', { name:/Colour palette A row/ }).click();
  await page.waitForFunction(() => document.querySelector('#tplLibPreviewStatus')?.textContent === 'Up to date');
}

try {
  await openPalette();
  const desktop = await page.evaluate(() => {
    const box = id => { const r=document.querySelector(id).getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height, bottom:r.bottom }; };
    const labels=[...document.querySelectorAll('#tplLibForm label[for]')];
    return {
      workspace:box('#tplLibWorkspace'), editor:box('#tplLibEditorPane'), preview:box('#tplLibPreviewPane'),
      grid:getComputedStyle(document.querySelector('#tplLibWorkspace')).gridTemplateColumns,
      labelled:labels.length>0 && labels.every(label => document.getElementById(label.htmlFor)),
      overflow:document.documentElement.scrollWidth>innerWidth,
    };
  });
  check('desktop uses a two-pane workspace', desktop.grid.split(' ').length >= 2, desktop.grid);
  check('live preview is beside the editor and inside the viewport', desktop.preview.x > desktop.editor.x + 200 && desktop.preview.y < 900, JSON.stringify(desktop.preview));
  check('generated fields have associated labels', desktop.labelled);
  check('desktop has no horizontal overflow', !desktop.overflow);

  const title = page.getByLabel('Title', { exact:true });
  await title.fill('Live palette test');
  await page.waitForFunction(() => document.querySelector('#tplLibPreviewStatus')?.textContent === 'Up to date');
  await page.waitForFunction(() => document.querySelectorAll('#tplLibPreview iframe').length === 1);
  const previewTitle = page.frameLocator('#tplLibPreview iframe').getByText('Live palette test', { exact:true }).first();
  await previewTitle.waitFor();
  check('typing updates the visible preview', await previewTitle.isVisible());
  check('preview swaps cleanly to one settled frame', await page.locator('#tplLibPreview iframe').count() === 1);

  await page.getByRole('button', { name:'‹ Families' }).click();
  await page.getByRole('searchbox', { name:/Search templates/ }).fill('scored quiz');
  await page.getByRole('button', { name:/Scored quiz A short/ }).click();
  await page.waitForFunction(() => document.querySelector('#tplLibPreviewStatus')?.textContent === 'Up to date');
  const quiz = await page.evaluate(() => ({
    fields:document.querySelectorAll('#tplLibForm input,#tplLibForm textarea,#tplLibForm select').length,
    rows:document.querySelectorAll('#tplLibForm .tlf-arr-row').length,
    firstRowDisplay:getComputedStyle(document.querySelector('#tplLibForm .tlf-arr-row')).display,
    previewTop:document.querySelector('#tplLibPreviewPane').getBoundingClientRect().top,
  }));
  check('complex quiz renders all controls', quiz.fields >= 20 && quiz.rows >= 4, JSON.stringify(quiz));
  check('repeatable quiz rows use compact desktop grids', quiz.firstRowDisplay === 'grid');
  check('quiz preview remains visible while editing', quiz.previewTop < 900);

  await page.setViewportSize({ width:390, height:844 });
  await openPalette();
  let mobile = await page.evaluate(() => ({
    switchDisplay:getComputedStyle(document.querySelector('.tpllib-mobile-switch')).display,
    editorDisplay:getComputedStyle(document.querySelector('#tplLibEditorPane')).display,
    previewDisplay:getComputedStyle(document.querySelector('#tplLibPreviewPane')).display,
    overflow:document.documentElement.scrollWidth>innerWidth,
  }));
  check('phone starts in focused Edit mode', mobile.switchDisplay !== 'none' && mobile.editorDisplay !== 'none' && mobile.previewDisplay === 'none');
  check('phone has no horizontal overflow', !mobile.overflow);
  await page.getByRole('tab', { name:'Preview' }).click();
  mobile = await page.evaluate(() => ({ editor:getComputedStyle(document.querySelector('#tplLibEditorPane')).display, preview:getComputedStyle(document.querySelector('#tplLibPreviewPane')).display }));
  check('phone Preview tab swaps panes', mobile.editor === 'none' && mobile.preview !== 'none');

  await page.setViewportSize({ width:820, height:1180 });
  await page.getByRole('tab', { name:'Edit' }).click();
  const tablet = await page.evaluate(() => ({ tabs:getComputedStyle(document.querySelector('.tpllib-mobile-switch')).display, overflow:document.documentElement.scrollWidth>innerWidth }));
  check('tablet uses the uncluttered Edit/Preview layout', tablet.tabs !== 'none' && !tablet.overflow);
} finally {
  await browser.close();
  server.close();
}

if (checks.some(item => !item.ok)) process.exitCode = 1;
