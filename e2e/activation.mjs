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
// Deliberately NOT part of `npm test`: it needs a browser and a test-keyed dist/. It lives
// OUTSIDE test/ because `node --test` discovers every file under a test/ directory whatever
// it is named, so putting it there made `npm test` fail against a normal production build.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { mintTestLicence, TEST_PUBLIC_KEY_HEX } from '../test/fixtures/testLicence.mjs';

const ROOT = 'dist';
const LIC_STORE = 'helm.studio.licence';
const LEGAL_STORE = 'chapbook.legalConsent.v1';

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

async function freshPage({ acceptLegal = true } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/app/`, { waitUntil: 'load' });
  if (acceptLegal) await acceptLegalConsent(page);
  await settle(page);
  return { ctx, page, errors };
}

// The launch build intentionally places its versioned clickwrap before both activation
// and the app. Exercise the three independent affirmative checks through the real UI so
// licence tests cannot silently bypass the legal gate or flake behind its modal.
async function acceptLegalConsent(page) {
  const gate = page.locator('#legalConsentGate');
  if (await gate.isHidden()) return;
  await page.check('#lcTerms');
  await page.check('#lcNotices');
  await page.check('#lcAge');
  await page.click('#lcAccept');
  await gate.waitFor({ state: 'hidden' });
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

// 1. Legal acceptance is the first gate, persists a versioned record, and only then
//    reveals the licence challenge.
{
  const { ctx, page } = await freshPage({ acceptLegal: false });
  const firstGate = await page.evaluate(() => ({
    legalVisible: !document.getElementById('legalConsentGate').hidden,
    appHidden: getComputedStyle(document.getElementById('app')).display === 'none',
  }));
  check('a fresh browser is stopped by the legal consent gate', firstGate.legalVisible && firstGate.appHidden);
  // First-run text must remain readable before the user can reach Settings.
  // This catches a missing panel token falling back to navy in the light theme.
  for (const theme of ['light', 'dark']) {
    const contrast = await page.evaluate(async theme => {
      const root = document.documentElement, previous = root.getAttribute('data-theme');
      root.setAttribute('data-theme', theme);
      // Measure the settled palette, not intermediate colours during a theme fade.
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(a => a.constructor.name === 'CSSTransition')
        .map(a => a.finished.catch(() => {})));
      const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
      const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
      const backdrop = el => {
        const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
        return chain.reduce((bg, n) => over(rgba(getComputedStyle(n).backgroundColor), bg), [255, 255, 255]);
      };
      const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const ratios = ['#legalConsentTitle', '.lc-copy', '.lc-ai', '.legal-consent-card label', '.lc-accept'].map(selector => {
        const el = document.querySelector(selector), bg = backdrop(el);
        const a = luminance(over(rgba(getComputedStyle(el).color), bg)), b = luminance(bg);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      if (previous === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', previous);
      return Math.min(...ratios);
    }, theme);
    check(`first-run ${theme} text meets 4.5:1 contrast`, contrast >= 4.5, `minimum ${contrast.toFixed(2)}:1`);
  }
  await acceptLegalConsent(page);
  const accepted = await page.evaluate((key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }, LEGAL_STORE);
  check('legal consent records the current version and three affirmative choices',
    accepted?.version === '2026-10-18'
      && accepted?.termsAccepted === true
      && accepted?.noticesAcknowledged === true
      && accepted?.ageConfirmed === true
      && !Number.isNaN(Date.parse(accepted?.acceptedAt || '')));
  const licenceVisible = await page.evaluate(() => getComputedStyle(document.getElementById('licence')).display !== 'none');
  check('licence gate follows legal acceptance', licenceVisible);

  // A material revision must not treat an older acceptance as current.
  await page.evaluate((key) => {
    const prior = JSON.parse(localStorage.getItem(key));
    prior.version = '2026-08-08';
    localStorage.setItem(key, JSON.stringify(prior));
  }, LEGAL_STORE);
  await page.reload({ waitUntil: 'load' });
  await page.locator('#legalConsentGate').waitFor({ state: 'visible' });
  check('an older policy acceptance requires renewed agreement',
    await page.locator('#lcAccept').isDisabled());
  await acceptLegalConsent(page);
  const revisedVersion = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).version, LEGAL_STORE);
  check('renewed agreement replaces the previous policy version', revisedVersion === '2026-10-18');
  await ctx.close();
}

// 2. Rubbish is refused.
{
  const { ctx, page } = await freshPage();
  const r = await activate(page, 'IPL1.invalid');
  check('a malformed key is refused', r.gateVisible && /valid key/i.test(r.message), JSON.stringify(r.message));
  check('a refused key is NOT stored', r.stored === '');
  for (const theme of ['light', 'dark']) {
    const contrast = await page.evaluate(async theme => {
      document.documentElement.setAttribute('data-theme', theme);
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(a => a.constructor.name === 'CSSTransition')
        .map(a => a.finished.catch(() => {})));
      const el = document.getElementById('licMsg');
      const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
      const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
      const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n);
      const bg = chain.reduce((colour, n) => over(rgba(getComputedStyle(n).backgroundColor), colour), [255, 255, 255]);
      const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const a = luminance(over(rgba(getComputedStyle(el).color), bg)), b = luminance(bg);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }, theme);
    check(`activation errors meet 4.5:1 contrast in ${theme} mode`, contrast >= 4.5, `${contrast.toFixed(2)}:1`);
  }
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
// All-products keys use the same signature, storage and revocation checks.
{
  const { ctx, page } = await freshPage();
  const key = mintTestLicence({ product: 'all' });
  const r = await activate(page, key);
  check('a signed all-products licence opens the gate and is stored', !r.gateVisible && r.stored === key);
  await page.reload({ waitUntil: 'load' });
  await settle(page);
  check('an all-products licence remains activated after reload', await page.locator('#licence').isHidden());
  await ctx.close();
}

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
  await page.setViewportSize({ width: 320, height: 740 });
  const mobileSetup = await page.evaluate(() => {
    const overlay = document.querySelector('#byok-overlay');
    const card = overlay.querySelector('.bc').getBoundingClientRect();
    return {
      minFont: Math.min(...[...overlay.querySelectorAll('input,select')].map(el => parseFloat(getComputedStyle(el).fontSize))),
      contained: card.left >= 16 && card.right <= innerWidth - 16,
    };
  });
  check('phone setup inputs avoid iOS focus zoom', mobileSetup.minFont >= 16, `${mobileSetup.minFont}px`);
  check('phone setup card fits inside its horizontal padding', mobileSetup.contained);
  await ctx.close();
}

// 8. A licence does not leak between browsers (it is per-device by design).
{
  const { ctx, page } = await freshPage();
  await activate(page, mintTestLicence());
  await page.evaluate(() => window.startOnboardingQA());
  const dialog = page.getByRole('dialog', { name: 'A quick hello' });
  check('the first-run profile panel is an accessible dialog', await dialog.isVisible());
  check('the profile panel focuses its first input', await page.locator('#qa-name').evaluate(el => el === document.activeElement));
  await page.locator('#qa-name').press('Shift+Tab');
  check('backward tab stays inside the profile dialog', await page.locator('#qaSave').evaluate(el => el === document.activeElement));
  await page.locator('#qaSave').press('Tab');
  check('forward tab wraps inside the profile dialog', await page.locator('#qa-name').evaluate(el => el === document.activeElement));
  await page.setViewportSize({ width: 320, height: 740 });
  const mobileProfile = await dialog.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 16 && rect.right <= innerWidth - 16;
  });
  check('phone profile dialog fits inside its horizontal padding', mobileProfile);
  for (const theme of ['light', 'dark']) {
    const minimum = await page.evaluate(async theme => {
      document.documentElement.setAttribute('data-theme', theme);
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(a => a.constructor.name === 'CSSTransition')
        .map(a => a.finished.catch(() => {})));
      const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
      const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
      const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      return Math.min(...['#qaTitle', '#qaOverlay .qsub', '#qaOverlay label', '#qaSkip'].map(selector => {
        const el = document.querySelector(selector), chain = [];
        for (let n = el; n; n = n.parentElement) chain.unshift(n);
        const bg = chain.reduce((colour, n) => over(rgba(getComputedStyle(n).backgroundColor), colour), [255, 255, 255]);
        const a = luminance(over(rgba(getComputedStyle(el).color), bg)), b = luminance(bg);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      }));
    }, theme);
    check(`profile dialog text meets 4.5:1 in ${theme} mode`, minimum >= 4.5, `${minimum.toFixed(2)}:1`);
  }
  await page.locator('#qa-name').press('Escape');
  check('Escape dismisses the optional profile dialog', await dialog.count() === 0);
  await ctx.close();
}

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
