import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { extractStripeUrl, extractLegalBlock, LEGAL_TITLES, renderLegalPage, injectMarketing } from './src/marketing/build-marketing.mjs';

const idx = readFileSync('src/index.html', 'utf8');

test('extractStripeUrl finds the live client_reference_id=studio link', () => {
  const u = extractStripeUrl(idx);
  assert.match(u, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+\?client_reference_id=studio$/);
  assert.ok(!u.includes('test_'));
});

test('extractLegalBlock returns non-empty inner HTML for all three kinds', () => {
  for (const kind of ['privacy', 'terms', 'refunds']) {
    const inner = extractLegalBlock(idx, kind);
    assert.ok(inner.length > 200, `${kind} block too short`);
    assert.ok(!inner.includes('id="legal-'), 'must be INNER html only');
  }
  // spot-check anchors that must survive extraction verbatim
  assert.match(extractLegalBlock(idx, 'privacy'), /local-first/);
  assert.match(extractLegalBlock(idx, 'terms'), /RQAI Ltd/);
  assert.match(extractLegalBlock(idx, 'refunds'), /14 days/);
});

test('extractLegalBlock throws on a missing block', () => {
  assert.throws(() => extractLegalBlock('<p>no legal here</p>', 'privacy'));
});

test('injectMarketing replaces every marker and token', () => {
  const out = injectMarketing(
    '<!-- MKT:NAV -->\n%%PRICE%% at %%STRIPE_BUY_URL%% (c) %%YEAR%%\n<!-- MKT:FOOTER -->\n<!-- MKT:TRIAL -->',
    { nav: 'NAVBAR', footer: 'FOOT', trial: 'TRIALFORM', stripeUrl: 'https://buy.stripe.com/X?client_reference_id=studio', price: '£49', year: '2026' });
  assert.ok(out.includes('NAVBAR') && out.includes('FOOT') && out.includes('TRIALFORM'));
  assert.ok(out.includes('£49') && out.includes('2026') && out.includes('buy.stripe.com/X'));
  assert.ok(!out.includes('%%') && !out.includes('MKT:'), 'no markers/tokens left');
});

test('renderLegalPage produces a full standalone document', () => {
  const html = renderLegalPage({ kind: 'privacy', title: LEGAL_TITLES.privacy, inner: '<p>hi</p>', nav: 'N', footer: 'F', year: '2026' });
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<title>Privacy/);
  assert.match(html, /<link rel="canonical" href="https:\/\/chapbook\.rqai\.co\.uk\/privacy">/);
  assert.ok(html.includes('<p>hi</p>'));
});

// ---- integration assertions: these read dist/, so they only run after `node build.mjs`.
// They skip gracefully when the site has not been built yet, so `node --test` on a fresh
// checkout still passes; the build step below re-runs them for real.
test('built sw.js targets /app shell and CACHE v7', (t) => {
  if (!existsSync('dist/sw.js')) return t.skip('dist not built — run `node build.mjs` first');
  const sw = readFileSync('dist/sw.js', 'utf8');
  assert.match(sw, /const CACHE\s*=\s*'chapbook-v7'/);
  const shell = sw.match(/const SHELL\s*=\s*\[([\s\S]*?)\]/)[1];
  assert.ok(shell.includes("'/app'") && shell.includes("'/app/index.html'"));
  assert.ok(!/['"]\/index\.html['"]/.test(shell), "must not precache the marketing '/index.html' as app shell");
});

test('manifest scoped to /app, id unchanged', (t) => {
  if (!existsSync('dist/manifest.json')) return t.skip('dist not built — run `node build.mjs` first');
  const m = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
  assert.equal(m.start_url, '/app'); assert.equal(m.scope, '/app'); assert.equal(m.id, '/');
});
