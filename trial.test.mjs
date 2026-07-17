// Task 7 — the shared trial partial (`src/marketing/_trial.html`): the 7-day,
// email-capture form injected on the home, features and pricing pages via the
// <!-- MKT:TRIAL --> marker. It POSTs same-origin to the real trial-request function
// and reports the honest server message.
//
// Source assertions read the partial and run with no build. The dist assertions read
// dist/*.html and skip gracefully when the site is unbuilt, so `node --test` on a fresh
// checkout still passes; the pre-commit `node build.mjs` run exercises them for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = 'src/marketing/_trial.html';
const src = () => readFileSync(SRC, 'utf8');

// ---- the anchor target + card shell -----------------------------------------
test('trial: the section carries id="trial" so #trial anchors resolve', () => {
  const html = src();
  assert.match(html, /id="trial"/, 'an element must carry id="trial"');
  // exactly one id="trial" (the grep-gate on dist counts on it being unique)
  assert.equal((html.match(/id="trial"/g) || []).length, 1, 'exactly one id="trial"');
  assert.match(html, /class="eyebrow"[^>]*>Free for 7 days</, 'the 7-day eyebrow');
});

// ---- the form contract -------------------------------------------------------
test('trial: the form has an email input, a submit button, and a live status region', () => {
  const html = src();
  assert.match(html, /<form class="trial-form" novalidate>/, 'a novalidate trial-form');
  assert.match(html, /<input type="email"[^>]*name="email"[^>]*required/, 'a required email input');
  assert.match(html, /autocomplete="email"/, 'the email input is autocompletable');
  assert.match(html, /aria-label="Your email"/, 'the email input is labelled');
  assert.match(html, /<button class="btn-primary" type="submit">/, 'a submit button');
  assert.match(html, /class="trial-msg" role="status" aria-live="polite"/,
    'a polite aria-live status region for the result');
});

// ---- the inline JS: same-origin POST, honest messaging, no libraries ---------
test('trial: the inline script POSTs {email,product:studio} same-origin and shows the server message', () => {
  const html = src();
  assert.match(html, /fetch\('\/\.netlify\/functions\/trial-request'/, 'same-origin POST to the real function');
  assert.match(html, /product:\s*'studio'/, "sends product:'studio' (the only accepted value)");
  assert.match(html, /method:\s*'POST'/);
  assert.match(html, /'content-type':\s*'application\/json'/);
  assert.match(html, /e\.preventDefault\(\)/, 'the submit is intercepted, no full-page nav');
  // honest state handling: it surfaces the returned message and a friendly fallback
  assert.match(html, /res\.b\.message/, 'success shows the server message verbatim');
  assert.match(html, /support@rqai\.co\.uk/, 'the error fallback points at support');
  // no external hosts, no libraries, no insecure URLs
  assert.ok(!/<script[^>]+src=/.test(html), 'no external <script src> — inline only');
  assert.ok(!/https?:\/\//.test(html), 'the partial calls out to no external host');
});

// ---- copy discipline ---------------------------------------------------------
test('trial: no em-dashes and no denylisted terms in the partial', () => {
  const html = src();
  assert.ok(!html.includes('—'), 'no em-dashes in the trial copy');
  for (const banned of ['hosted Studio', 'clinical', 'studio@']) {
    assert.ok(!new RegExp(banned, 'i').test(html), `denylisted term present: ${banned}`);
  }
});

// ---- dist: the endpoint wiring survives into every page that includes it -----
test('trial (dist): the form and endpoint are poured into pricing and home', (t) => {
  if (!existsSync('dist/pricing.html')) return t.skip('dist not built — run `node build.mjs` first');
  for (const page of ['dist/pricing.html', 'dist/index.html']) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /functions\/trial-request/, `${page} missing the trial endpoint`);
    assert.equal((html.match(/id="trial"/g) || []).length, 1, `${page} must carry exactly one id="trial"`);
    assert.match(html, /class="trial-form"/, `${page} missing the trial form`);
    assert.ok(!html.includes('<!-- MKT:TRIAL -->'), `${page} must resolve the trial marker`);
  }
});
