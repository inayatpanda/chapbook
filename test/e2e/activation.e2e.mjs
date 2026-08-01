// Authenticated-gate E2E — the run the audit could not do.
//
// Every authenticated journey in Chapbook starts behind "Activate Chapbook", and there was
// no safe key to get past it, so nothing downstream had ever been exercised in a browser.
// This drives the REAL gate in a REAL browser using a licence minted by the throwaway
// keypair in test/fixtures/testLicence.mjs.
//
// Requires a TEST-KEYED build (a production build cannot verify these licences, by design):
//   npm run build:test && npm run e2e
//
// Deliberately NOT part of `npm test`: it needs a browser and a built dist/, and the file is
// named .e2e.mjs so `node --test`'s discovery ignores it.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { mintTestLicence, TEST_PUBLIC_KEY_HEX } from '../fixtures/testLicence.mjs';

const ROOT = 'dist';
const LIC_STORE = 'helm.studio.licence';

if (!existsSync(`${ROOT}/TEST-BUILD`)) {
  console.error('\nThis suite needs a test-keyed build. Run:  npm run build:test\n');
  process.exit(2);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await import('playwright');
const browser = await chromium.launch();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function freshPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/app/`, { waitUntil: 'load' });
  await settle(page);
  return { ctx, page, errors };
}

// #licence starts as style="display:none" and is only SHOWN once boot decides to challenge.
// Checking it immediately therefore "passes" for an unactivated browser AND for a page that
// has simply not got there yet, so wait for the decision instead of sleeping.
// Three possible resting states: challenged by the gate, onboarding (activated but no repo
// connected yet — #byok-overlay), or the app itself.
async function settle(page) {
  await page.waitForFunction(() => {
    const vis = (id) => {
      const el = document.getElementById(id);
      return !!el && getComputedStyle(el).display !== 'none';
    };
    return vis('licence') || vis('app') || !!document.getElementById('byok-overlay');
  }, null, { timeout: 20000 });
}

// Type a key into the real input and press the real button, rather than calling
// verifyLicence() directly — the point is to exercise the gate's wiring, not its maths.
async function activate(page, key) {
  await page.fill('#licKey', key);
  await page.click('#licence button.btn'); // the gate's Activate button (onclick=submitLicence)
  // submitLicence() awaits WebCrypto AND a revocation-list fetch to inayatpanda.com that
  // fails open. Offline that fetch runs to its own timeout, so a fixed sleep either flakes
  // or hides a real failure — wait for the outcome (gate closed, or an error shown) instead.
  await page.waitForFunction(() => {
    const lic = document.getElementById('licence');
    const m = document.getElementById('licMsg');
    return getComputedStyle(lic).display === 'none' || (m && m.textContent.trim() !== '');
  }, null, { timeout: 20000 }).catch(() => {});
  return page.evaluate(() => ({
    gateVisible: getComputedStyle(document.getElementById('licence')).display !== 'none',
    message: (document.getElementById('licMsg') || {}).textContent || '',
    stored: localStorage.getItem('helm.studio.licence') || '',
  }));
}

console.log(`\nActivation E2E (test key ${TEST_PUBLIC_KEY_HEX.slice(0, 12)}…)\n`);

// 1. The gate is actually in the way to begin with.
{
  const { ctx, page } = await freshPage();
  const gate = await page.evaluate(() => ({
    visible: getComputedStyle(document.getElementById('licence')).display !== 'none',
    appHidden: getComputedStyle(document.getElementById('app')).display === 'none',
  }));
  check('a fresh browser is stopped by the licence gate', gate.visible && gate.appHidden);
  await ctx.close();
}

// 2. Rubbish is refused.
{
  const { ctx, page } = await freshPage();
  const r = await activate(page, 'IPL1.invalid');
  check('a malformed key is refused', r.gateVisible && /valid key/i.test(r.message), JSON.stringify(r.message));
  check('a refused key is NOT stored', r.stored === '');
  await ctx.close();
}

// 3. A licence signed by the WRONG key is refused. This is the assertion that proves the
//    test keypair grants nothing on a real build: same payload, production-style signature
//    it cannot produce.
{
  const { ctx, page } = await freshPage();
  const good = mintTestLicence();
  const [, payload] = good.split('.');
  const forged = `IPL1.${payload}.${'A'.repeat(86)}`; // 64 bytes of b64url garbage
  const r = await activate(page, forged);
  check('a bad signature is refused', r.gateVisible && /verification/i.test(r.message), JSON.stringify(r.message));
  await ctx.close();
}

// 4. Expiry is enforced.
{
  const { ctx, page } = await freshPage();
  const r = await activate(page, mintTestLicence({ expires: '2020-01-01T00:00:00.000Z' }));
  check('an expired licence is refused', r.gateVisible && /expired/i.test(r.message), JSON.stringify(r.message));
  await ctx.close();
}

// 5. Product scope: a validly-signed key for another RQAI product must not open Chapbook.
{
  const { ctx, page } = await freshPage();
  const r = await activate(page, mintTestLicence({ product: 'someotherproduct' }));
  check('a valid key for a different product is refused', r.gateVisible && /different product/i.test(r.message), JSON.stringify(r.message));
  await ctx.close();
}

// 6. THE ONE THAT MATTERS: a good licence opens the gate.
{
  const { ctx, page, errors } = await freshPage();
  const key = mintTestLicence({ name: 'E2E Test User' });
  const r = await activate(page, key);
  check('a valid licence opens the gate', !r.gateVisible, `gateVisible=${r.gateVisible} msg=${JSON.stringify(r.message)}`);
  check('the licence is persisted for next boot', r.stored === key);
  check('activation raises no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

  // 7. It stays activated across a reload — the gate must not re-challenge.
  await page.reload({ waitUntil: 'load' });
  await settle(page); // wait for boot's decision, or this passes before the gate can appear
  const after = await page.evaluate(() => ({
    gate: getComputedStyle(document.getElementById('licence')).display !== 'none',
    onboarding: !!document.getElementById('byok-overlay'),
  }));
  check('still activated after a reload', !after.gate);
  // Past the licence gate, the next thing a new user must do is connect GitHub. Reaching
  // this overlay is what the audit meant by "blocked at the licence gate" — it is the
  // starting line for the publish journey that is still to be built.
  check('lands on GitHub onboarding, the next step in the journey', after.onboarding);
  await ctx.close();
}

// 8. A licence does not leak between browsers (it is per-device by design).
{
  const { ctx, page } = await freshPage();
  const gate = await page.evaluate(() => getComputedStyle(document.getElementById('licence')).display !== 'none');
  check('a different browser profile is challenged again', gate);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} activation checks passed\n`);
process.exit(failed.length ? 1 : 0);
